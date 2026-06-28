const axios = require('axios');
const MonitoringResult = require('../models/MonitoringResult');
const Api = require('../models/Api');
const { validateResponse } = require('./responseValidator');
const { checkAndCreateIncident, autoResolveIncident } = require('./incidentService');

/**
 * Execute a health check for a given API
 */
const executeHealthCheck = async (apiDoc) => {
  const startTime = Date.now();
  let result = {
    api: apiDoc._id,
    user: apiDoc.user,
    timestamp: new Date(),
    statusCode: null,
    responseTime: null,
    success: false,
    errorMessage: null,
    responseBody: null,
    responseHeaders: {},
    contentType: null,
    validationErrors: [],
  };

  try {
    // Build request config
    const config = {
      method: apiDoc.method.toLowerCase(),
      url: apiDoc.url,
      timeout: apiDoc.timeout || 30000,
      headers: {},
      params: {},
      validateStatus: () => true, // Don't throw on any status
    };

    // Add headers
    if (apiDoc.headers && apiDoc.headers instanceof Map) {
      for (const [key, value] of apiDoc.headers) {
        config.headers[key] = value;
      }
    } else if (apiDoc.headers && typeof apiDoc.headers === 'object') {
      config.headers = { ...config.headers, ...apiDoc.headers };
    }

    // Add query params
    if (apiDoc.queryParams && apiDoc.queryParams instanceof Map) {
      for (const [key, value] of apiDoc.queryParams) {
        config.params[key] = value;
      }
    } else if (apiDoc.queryParams && typeof apiDoc.queryParams === 'object') {
      config.params = { ...config.params, ...apiDoc.queryParams };
    }

    // Add body for methods that support it
    if (['post', 'put', 'patch'].includes(config.method) && apiDoc.body) {
      config.data = apiDoc.body;
    }

    // Execute request
    const response = await axios(config);
    const endTime = Date.now();

    result.statusCode = response.status;
    result.responseTime = endTime - startTime;
    result.contentType = response.headers['content-type'] || null;
    result.success = true;

    // Store response body (truncate if too large)
    try {
      const body = response.data;
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      result.responseBody = bodyStr.length > 10000 ? bodyStr.substring(0, 10000) + '...[truncated]' : body;
    } catch {
      result.responseBody = null;
    }

    // Store response headers
    if (response.headers) {
      const headerMap = {};
      for (const [key, value] of Object.entries(response.headers)) {
        if (typeof value === 'string') {
          headerMap[key] = value;
        }
      }
      result.responseHeaders = headerMap;
    }

    // Validate response
    const validationResult = validateResponse(apiDoc, result);
    if (!validationResult.valid) {
      result.success = false;
      result.validationErrors = validationResult.errors;
      result.errorMessage = validationResult.errors.join('; ');
    }
  } catch (error) {
    const endTime = Date.now();
    result.responseTime = endTime - startTime;
    result.success = false;

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      result.errorMessage = `Request timed out after ${apiDoc.timeout || 30000}ms`;
    } else if (error.code === 'ECONNREFUSED') {
      result.errorMessage = `Connection refused: ${apiDoc.url}`;
    } else if (error.code === 'ENOTFOUND') {
      result.errorMessage = `DNS resolution failed: ${apiDoc.url}`;
    } else if (error.code === 'ERR_BAD_REQUEST') {
      result.errorMessage = `Bad request: ${error.message}`;
    } else {
      result.errorMessage = error.message || 'Unknown error occurred';
    }
  }

  // Save monitoring result
  const savedResult = await MonitoringResult.create(result);

  // Update API status
  const updateData = {
    lastCheckedAt: new Date(),
    lastResponseTime: result.responseTime,
  };

  if (result.success) {
    updateData.consecutiveFailures = 0;
    updateData.status = 'healthy';
    // Auto-resolve incident if API recovers
    await autoResolveIncident(apiDoc._id);
  } else {
    updateData.lastFailedAt = new Date();
    updateData.consecutiveFailures = (apiDoc.consecutiveFailures || 0) + 1;

    if (updateData.consecutiveFailures >= 3) {
      updateData.status = 'offline';
    } else {
      updateData.status = 'degraded';
    }

    // Check and create incident
    await checkAndCreateIncident(apiDoc, result, updateData.consecutiveFailures);
  }

  await Api.findByIdAndUpdate(apiDoc._id, updateData);

  return savedResult;
};

module.exports = { executeHealthCheck };
