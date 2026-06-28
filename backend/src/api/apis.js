const express = require('express');
const Api = require('../models/Api');
const MonitoringResult = require('../models/MonitoringResult');
const Incident = require('../models/Incident');
const { protect } = require('../utils/auth');
const { AppError } = require('../utils/errorHandler');
const { executeHealthCheck } = require('../services/monitorService');
const {
  scheduleApiMonitoring,
  removeApiMonitoring,
  rescheduleApiMonitoring,
} = require('../services/scheduler');

const router = express.Router();

// All routes are protected
router.use(protect);

// POST /api/apis - Create a new API monitor
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      url,
      method,
      headers,
      queryParams,
      body,
      expectedStatusCode,
      expectedJsonFields,
      timeout,
      interval,
    } = req.body;

    if (!name || !url) {
      throw new AppError('API name and URL are required', 400);
    }

    const apiDoc = await Api.create({
      name,
      url,
      method: method || 'GET',
      headers: headers || {},
      queryParams: queryParams || {},
      body: body || null,
      expectedStatusCode: expectedStatusCode || 200,
      expectedJsonFields: expectedJsonFields || [],
      timeout: timeout || 30000,
      interval: interval || '5m',
      user: req.user._id,
    });

    // Schedule monitoring
    scheduleApiMonitoring(apiDoc);

    // Execute initial health check
    try {
      await executeHealthCheck(apiDoc);
    } catch (error) {
      console.error(`[API] Initial health check failed for "${name}":`, error.message);
    }

    // Re-fetch to get updated status
    const updatedApi = await Api.findById(apiDoc._id);

    res.status(201).json({
      success: true,
      data: updatedApi,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/apis - List all APIs for user (with search/filter)
router.get('/', async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;

    const filter = { user: req.user._id };

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [apis, total] = await Promise.all([
      Api.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Api.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: apis,
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

// GET /api/apis/:id - Get API details
router.get('/:id', async (req, res, next) => {
  try {
    const api = await Api.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!api) {
      throw new AppError('API not found', 404);
    }

    res.status(200).json({
      success: true,
      data: api,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/apis/:id - Update API monitor
router.put('/:id', async (req, res, next) => {
  try {
    const api = await Api.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!api) {
      throw new AppError('API not found', 404);
    }

    const allowedFields = [
      'name', 'url', 'method', 'headers', 'queryParams', 'body',
      'expectedStatusCode', 'expectedJsonFields', 'timeout', 'interval', 'isActive',
    ];

    const previousInterval = api.interval;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        api[field] = req.body[field];
      }
    }

    await api.save();

    // Reschedule if interval changed or API was toggled
    if (api.isActive) {
      if (req.body.interval && req.body.interval !== previousInterval) {
        rescheduleApiMonitoring(api);
      }
    } else {
      removeApiMonitoring(api._id.toString());
    }

    res.status(200).json({
      success: true,
      data: api,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/apis/:id - Delete API and its results/incidents
router.delete('/:id', async (req, res, next) => {
  try {
    const api = await Api.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!api) {
      throw new AppError('API not found', 404);
    }

    // Remove scheduler job
    removeApiMonitoring(api._id.toString());

    // Delete related data
    await Promise.all([
      MonitoringResult.deleteMany({ api: api._id }),
      Incident.deleteMany({ api: api._id }),
      Api.findByIdAndDelete(api._id),
    ]);

    res.status(200).json({
      success: true,
      message: 'API and related data deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/apis/:id/check - Trigger manual health check
router.post('/:id/check', async (req, res, next) => {
  try {
    const api = await Api.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!api) {
      throw new AppError('API not found', 404);
    }

    const result = await executeHealthCheck(api);
    const updatedApi = await Api.findById(api._id);

    res.status(200).json({
      success: true,
      data: {
        api: updatedApi,
        result,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
