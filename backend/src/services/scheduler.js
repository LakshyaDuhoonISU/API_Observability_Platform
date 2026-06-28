const cron = require('node-cron');
const Api = require('../models/Api');
const { executeHealthCheck } = require('./monitorService');

// Store active cron jobs
const activeJobs = new Map();

// Map interval strings to cron expressions
const intervalToCron = {
  '1m': '* * * * *',        // Every minute
  '5m': '*/5 * * * *',      // Every 5 minutes
  '15m': '*/15 * * * *',    // Every 15 minutes
  '1h': '0 * * * *',        // Every hour
};

/**
 * Schedule monitoring for a single API
 */
const scheduleApiMonitoring = (apiDoc) => {
  const apiId = apiDoc._id.toString();

  // Remove existing job if any
  removeApiMonitoring(apiId);

  const cronExpression = intervalToCron[apiDoc.interval] || intervalToCron['5m'];

  const job = cron.schedule(cronExpression, async () => {
    try {
      // Re-fetch the API doc to get latest state
      const freshApi = await Api.findById(apiId);
      if (!freshApi || !freshApi.isActive) {
        removeApiMonitoring(apiId);
        return;
      }
      await executeHealthCheck(freshApi);
    } catch (error) {
      console.error(`[SCHEDULER] Error monitoring API ${apiId}:`, error.message);
    }
  });

  activeJobs.set(apiId, job);
  console.log(`[SCHEDULER] Scheduled monitoring for "${apiDoc.name}" (${apiDoc.interval})`);
};

/**
 * Remove monitoring for an API
 */
const removeApiMonitoring = (apiId) => {
  const existingJob = activeJobs.get(apiId);
  if (existingJob) {
    existingJob.stop();
    activeJobs.delete(apiId);
    console.log(`[SCHEDULER] Removed monitoring for API ${apiId}`);
  }
};

/**
 * Reschedule monitoring for an API (e.g., after interval change)
 */
const rescheduleApiMonitoring = (apiDoc) => {
  scheduleApiMonitoring(apiDoc);
};

/**
 * Initialize scheduler - load all active APIs and schedule them
 */
const initializeScheduler = async () => {
  try {
    const apis = await Api.find({ isActive: true });
    console.log(`[SCHEDULER] Found ${apis.length} active APIs to monitor`);

    for (const api of apis) {
      scheduleApiMonitoring(api);
    }

    console.log('[SCHEDULER] Initialization complete');
  } catch (error) {
    console.error('[SCHEDULER] Initialization error:', error.message);
  }
};

/**
 * Stop all active monitoring jobs
 */
const stopAllJobs = () => {
  for (const [apiId, job] of activeJobs) {
    job.stop();
  }
  activeJobs.clear();
  console.log('[SCHEDULER] All jobs stopped');
};

/**
 * Get number of active monitoring jobs
 */
const getActiveJobCount = () => activeJobs.size;

module.exports = {
  scheduleApiMonitoring,
  removeApiMonitoring,
  rescheduleApiMonitoring,
  initializeScheduler,
  stopAllJobs,
  getActiveJobCount,
};
