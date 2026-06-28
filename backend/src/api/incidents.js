const express = require('express');
const Incident = require('../models/Incident');
const { protect } = require('../utils/auth');
const { AppError } = require('../utils/errorHandler');

const router = express.Router();

// All routes are protected
router.use(protect);

// GET /api/incidents - List incidents with filters
router.get('/', async (req, res, next) => {
  try {
    const { status, severity, apiId, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { user: req.user._id };

    if (status && status !== 'all') {
      filter.status = status;
    }
    if (severity && severity !== 'all') {
      filter.severity = severity;
    }
    if (apiId) {
      filter.api = apiId;
    }

    const [incidents, total] = await Promise.all([
      Incident.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Incident.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: incidents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/incidents/:id - Get incident details
router.get('/:id', async (req, res, next) => {
  try {
    const incident = await Incident.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!incident) {
      throw new AppError('Incident not found', 404);
    }

    res.status(200).json({
      success: true,
      data: incident,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/incidents/:id - Update incident status
router.put('/:id', async (req, res, next) => {
  try {
    const incident = await Incident.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!incident) {
      throw new AppError('Incident not found', 404);
    }

    const { status, severity } = req.body;

    if (status) {
      const validTransitions = {
        open: ['investigating', 'resolved', 'closed'],
        investigating: ['resolved', 'closed'],
        resolved: ['closed'],
        closed: [],
      };

      if (!validTransitions[incident.status]?.includes(status)) {
        throw new AppError(
          `Cannot transition from "${incident.status}" to "${status}"`,
          400
        );
      }

      incident.status = status;

      if (status === 'resolved') {
        incident.resolvedAt = new Date();
        incident.duration = Math.round(
          (new Date() - new Date(incident.startedAt)) / 1000
        );
      }

      if (status === 'closed') {
        incident.closedAt = new Date();
        if (!incident.resolvedAt) {
          incident.resolvedAt = new Date();
          incident.duration = Math.round(
            (new Date() - new Date(incident.startedAt)) / 1000
          );
        }
      }
    }

    if (severity) {
      incident.severity = severity;
    }

    await incident.save();

    res.status(200).json({
      success: true,
      data: incident,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/incidents/:id - Delete incident
router.delete('/:id', async (req, res, next) => {
  try {
    const incident = await Incident.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!incident) {
      throw new AppError('Incident not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Incident deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
