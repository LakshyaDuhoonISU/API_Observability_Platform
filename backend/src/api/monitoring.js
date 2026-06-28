const express = require('express');
const MonitoringResult = require('../models/MonitoringResult');
const { protect } = require('../utils/auth');
const {
  getApiMetrics,
  getDashboardMetrics,
  getResponseTimeTrend,
  getOverallResponseTimeTrend,
  getStatusDistribution,
  getTopSlowApis,
  getIncidentsOverTime,
  getUptimeByApi,
} = require('../services/metricsService');

const router = express.Router();

// All routes are protected
router.use(protect);

// GET /api/monitoring/dashboard - Dashboard KPIs
router.get('/dashboard', async (req, res, next) => {
  try {
    const metrics = await getDashboardMetrics(req.user._id);
    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/monitoring/dashboard/charts - Dashboard chart data
router.get('/dashboard/charts', async (req, res, next) => {
  try {
    const { timeRange = '24h' } = req.query;

    const [
      responseTimeTrend,
      statusDistribution,
      topSlowApis,
      incidentsOverTime,
      uptimeByApi,
    ] = await Promise.all([
      getOverallResponseTimeTrend(req.user._id, timeRange),
      getStatusDistribution(req.user._id),
      getTopSlowApis(req.user._id, timeRange),
      getIncidentsOverTime(req.user._id, timeRange),
      getUptimeByApi(req.user._id, timeRange),
    ]);

    res.status(200).json({
      success: true,
      data: {
        responseTimeTrend,
        statusDistribution,
        topSlowApis,
        incidentsOverTime,
        uptimeByApi,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/monitoring/:apiId/results - Paginated monitoring results
router.get('/:apiId/results', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, timeRange } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {
      api: req.params.apiId,
      user: req.user._id,
    };

    if (timeRange) {
      const now = new Date();
      const timeMap = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      };
      if (timeMap[timeRange]) {
        filter.timestamp = { $gte: new Date(now.getTime() - timeMap[timeRange]) };
      }
    }

    const [results, total] = await Promise.all([
      MonitoringResult.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      MonitoringResult.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: results,
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

// GET /api/monitoring/:apiId/metrics - API metrics
router.get('/:apiId/metrics', async (req, res, next) => {
  try {
    const { timeRange = '24h' } = req.query;
    const metrics = await getApiMetrics(req.params.apiId, timeRange);

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/monitoring/:apiId/trend - Response time trend
router.get('/:apiId/trend', async (req, res, next) => {
  try {
    const { timeRange = '24h' } = req.query;
    const trend = await getResponseTimeTrend(req.params.apiId, timeRange);

    res.status(200).json({
      success: true,
      data: trend,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
