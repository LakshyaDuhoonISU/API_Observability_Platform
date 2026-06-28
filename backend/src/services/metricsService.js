const MonitoringResult = require('../models/MonitoringResult');
const Api = require('../models/Api');
const Incident = require('../models/Incident');
const mongoose = require('mongoose');

/**
 * Get time range filter based on period string
 */
const getTimeRangeFilter = (timeRange) => {
  const now = new Date();
  switch (timeRange) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
};

/**
 * Get metrics for a specific API
 */
const getApiMetrics = async (apiId, timeRange = '24h') => {
  const since = getTimeRangeFilter(timeRange);

  const results = await MonitoringResult.aggregate([
    {
      $match: {
        api: new mongoose.Types.ObjectId(apiId),
        timestamp: { $gte: since },
      },
    },
    {
      $group: {
        _id: null,
        totalChecks: { $sum: 1 },
        successfulChecks: {
          $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] },
        },
        failedChecks: {
          $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] },
        },
        avgResponseTime: { $avg: '$responseTime' },
        maxResponseTime: { $max: '$responseTime' },
        minResponseTime: { $min: '$responseTime' },
        p95ResponseTime: { $percentile: { input: '$responseTime', p: [0.95], method: 'approximate' } },
      },
    },
  ]);

  const metrics = results[0] || {
    totalChecks: 0,
    successfulChecks: 0,
    failedChecks: 0,
    avgResponseTime: 0,
    maxResponseTime: 0,
    minResponseTime: 0,
    p95ResponseTime: [0],
  };

  const uptime = metrics.totalChecks > 0
    ? ((metrics.successfulChecks / metrics.totalChecks) * 100).toFixed(2)
    : 0;

  const successRate = metrics.totalChecks > 0
    ? ((metrics.successfulChecks / metrics.totalChecks) * 100).toFixed(2)
    : 0;

  const failureRate = metrics.totalChecks > 0
    ? ((metrics.failedChecks / metrics.totalChecks) * 100).toFixed(2)
    : 0;

  return {
    totalChecks: metrics.totalChecks,
    successfulChecks: metrics.successfulChecks,
    failedChecks: metrics.failedChecks,
    avgResponseTime: Math.round(metrics.avgResponseTime || 0),
    maxResponseTime: Math.round(metrics.maxResponseTime || 0),
    minResponseTime: Math.round(metrics.minResponseTime || 0),
    p95ResponseTime: Math.round((metrics.p95ResponseTime && metrics.p95ResponseTime[0]) || 0),
    uptime: parseFloat(uptime),
    successRate: parseFloat(successRate),
    failureRate: parseFloat(failureRate),
  };
};

/**
 * Get dashboard KPIs for a user
 */
const getDashboardMetrics = async (userId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Get API counts by status
  const apiCounts = await Api.aggregate([
    { $match: { user: userObjectId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const statusMap = {};
  let totalApis = 0;
  for (const item of apiCounts) {
    statusMap[item._id] = item.count;
    totalApis += item.count;
  }

  // Active incidents count
  const activeIncidents = await Incident.countDocuments({
    user: userObjectId,
    status: { $in: ['open', 'investigating'] },
  });

  // Average response time (last 24h)
  const since24h = getTimeRangeFilter('24h');
  const avgResult = await MonitoringResult.aggregate([
    {
      $match: {
        user: userObjectId,
        timestamp: { $gte: since24h },
        responseTime: { $ne: null },
      },
    },
    {
      $group: {
        _id: null,
        avgResponseTime: { $avg: '$responseTime' },
        totalChecks: { $sum: 1 },
        successfulChecks: {
          $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] },
        },
      },
    },
  ]);

  const avgData = avgResult[0] || {
    avgResponseTime: 0,
    totalChecks: 0,
    successfulChecks: 0,
  };

  const avgUptime = avgData.totalChecks > 0
    ? ((avgData.successfulChecks / avgData.totalChecks) * 100).toFixed(2)
    : 100;

  return {
    totalApis,
    healthyApis: statusMap['healthy'] || 0,
    degradedApis: statusMap['degraded'] || 0,
    offlineApis: statusMap['offline'] || 0,
    unknownApis: statusMap['unknown'] || 0,
    activeIncidents,
    avgResponseTime: Math.round(avgData.avgResponseTime || 0),
    avgUptime: parseFloat(avgUptime),
  };
};

/**
 * Get response time trend data for charting
 */
const getResponseTimeTrend = async (apiId, timeRange = '24h') => {
  const since = getTimeRangeFilter(timeRange);

  // Determine grouping interval based on time range
  let groupFormat;
  switch (timeRange) {
    case '24h':
      groupFormat = { $dateToString: { format: '%Y-%m-%dT%H:00', date: '$timestamp' } };
      break;
    case '7d':
      groupFormat = { $dateToString: { format: '%Y-%m-%dT%H:00', date: '$timestamp' } };
      break;
    case '30d':
      groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } };
      break;
    default:
      groupFormat = { $dateToString: { format: '%Y-%m-%dT%H:00', date: '$timestamp' } };
  }

  const results = await MonitoringResult.aggregate([
    {
      $match: {
        api: new mongoose.Types.ObjectId(apiId),
        timestamp: { $gte: since },
        responseTime: { $ne: null },
      },
    },
    {
      $group: {
        _id: groupFormat,
        avgResponseTime: { $avg: '$responseTime' },
        maxResponseTime: { $max: '$responseTime' },
        minResponseTime: { $min: '$responseTime' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return results.map((r) => ({
    time: r._id,
    avg: Math.round(r.avgResponseTime),
    max: Math.round(r.maxResponseTime),
    min: Math.round(r.minResponseTime),
    count: r.count,
  }));
};

/**
 * Get response time trend across all user's APIs for dashboard
 */
const getOverallResponseTimeTrend = async (userId, timeRange = '24h') => {
  const since = getTimeRangeFilter(timeRange);

  let groupFormat;
  switch (timeRange) {
    case '24h':
      groupFormat = { $dateToString: { format: '%Y-%m-%dT%H:00', date: '$timestamp' } };
      break;
    case '7d':
      groupFormat = { $dateToString: { format: '%Y-%m-%dT%H:00', date: '$timestamp' } };
      break;
    case '30d':
      groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } };
      break;
    default:
      groupFormat = { $dateToString: { format: '%Y-%m-%dT%H:00', date: '$timestamp' } };
  }

  const results = await MonitoringResult.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: since },
        responseTime: { $ne: null },
      },
    },
    {
      $group: {
        _id: groupFormat,
        avgResponseTime: { $avg: '$responseTime' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return results.map((r) => ({
    time: r._id,
    avg: Math.round(r.avgResponseTime),
    count: r.count,
  }));
};

/**
 * Get status distribution for user's APIs
 */
const getStatusDistribution = async (userId) => {
  const distribution = await Api.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  return distribution.map((d) => ({
    status: d._id,
    count: d.count,
  }));
};

/**
 * Get top 5 slowest APIs
 */
const getTopSlowApis = async (userId, timeRange = '24h') => {
  const since = getTimeRangeFilter(timeRange);

  const results = await MonitoringResult.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: since },
        responseTime: { $ne: null },
      },
    },
    {
      $group: {
        _id: '$api',
        avgResponseTime: { $avg: '$responseTime' },
      },
    },
    { $sort: { avgResponseTime: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'apis',
        localField: '_id',
        foreignField: '_id',
        as: 'apiInfo',
      },
    },
    { $unwind: '$apiInfo' },
    {
      $project: {
        apiName: '$apiInfo.name',
        apiUrl: '$apiInfo.url',
        avgResponseTime: { $round: ['$avgResponseTime', 0] },
      },
    },
  ]);

  return results;
};

/**
 * Get incidents over time for charting
 */
const getIncidentsOverTime = async (userId, timeRange = '24h') => {
  const since = getTimeRangeFilter(timeRange);

  let groupFormat;
  switch (timeRange) {
    case '24h':
      groupFormat = { $dateToString: { format: '%Y-%m-%dT%H:00', date: '$startedAt' } };
      break;
    case '7d':
      groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$startedAt' } };
      break;
    case '30d':
      groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$startedAt' } };
      break;
    default:
      groupFormat = { $dateToString: { format: '%Y-%m-%dT%H:00', date: '$startedAt' } };
  }

  const results = await Incident.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        startedAt: { $gte: since },
      },
    },
    {
      $group: {
        _id: groupFormat,
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return results.map((r) => ({
    time: r._id,
    count: r.count,
  }));
};

/**
 * Get uptime percentage for each API (for bar chart)
 */
const getUptimeByApi = async (userId, timeRange = '24h') => {
  const since = getTimeRangeFilter(timeRange);

  const results = await MonitoringResult.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: since },
      },
    },
    {
      $group: {
        _id: '$api',
        totalChecks: { $sum: 1 },
        successfulChecks: {
          $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] },
        },
      },
    },
    {
      $lookup: {
        from: 'apis',
        localField: '_id',
        foreignField: '_id',
        as: 'apiInfo',
      },
    },
    { $unwind: '$apiInfo' },
    {
      $project: {
        apiName: '$apiInfo.name',
        uptime: {
          $round: [
            {
              $multiply: [
                { $divide: ['$successfulChecks', '$totalChecks'] },
                100,
              ],
            },
            2,
          ],
        },
        totalChecks: 1,
      },
    },
    { $sort: { uptime: 1 } },
  ]);

  return results;
};

module.exports = {
  getApiMetrics,
  getDashboardMetrics,
  getResponseTimeTrend,
  getOverallResponseTimeTrend,
  getStatusDistribution,
  getTopSlowApis,
  getIncidentsOverTime,
  getUptimeByApi,
};
