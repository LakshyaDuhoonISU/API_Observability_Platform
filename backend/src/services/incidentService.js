const Incident = require('../models/Incident');

const CONSECUTIVE_FAILURES_THRESHOLD = 3;

/**
 * Check if an incident should be created after consecutive failures
 */
const checkAndCreateIncident = async (apiDoc, result, consecutiveFailures) => {
  if (consecutiveFailures < CONSECUTIVE_FAILURES_THRESHOLD) {
    return null;
  }

  // Check if there's already an open incident for this API
  const existingIncident = await Incident.findOne({
    api: apiDoc._id,
    status: { $in: ['open', 'investigating'] },
  });

  if (existingIncident) {
    // Update failure count on existing incident
    existingIncident.failureCount = consecutiveFailures;
    existingIncident.failureReason = result.errorMessage || 'Health check failed';
    await existingIncident.save();
    return existingIncident;
  }

  // Determine severity based on consecutive failures
  let severity = 'minor';
  if (consecutiveFailures >= 10) {
    severity = 'critical';
  } else if (consecutiveFailures >= 5) {
    severity = 'major';
  }

  // Create new incident
  const incident = await Incident.create({
    api: apiDoc._id,
    user: apiDoc.user,
    apiName: apiDoc.name,
    apiUrl: apiDoc.url,
    status: 'open',
    severity,
    failureReason: result.errorMessage || 'Health check failed',
    startedAt: new Date(),
    failureCount: consecutiveFailures,
  });

  console.log(`[INCIDENT] Created incident for API "${apiDoc.name}" (${consecutiveFailures} consecutive failures)`);

  return incident;
};

/**
 * Auto-resolve open incidents when API recovers
 */
const autoResolveIncident = async (apiId) => {
  const openIncidents = await Incident.find({
    api: apiId,
    status: { $in: ['open', 'investigating'] },
  });

  for (const incident of openIncidents) {
    incident.status = 'resolved';
    incident.resolvedAt = new Date();
    incident.duration = Math.round(
      (new Date() - new Date(incident.startedAt)) / 1000
    );
    await incident.save();
    console.log(`[INCIDENT] Auto-resolved incident for API "${incident.apiName}"`);
  }
};

module.exports = { checkAndCreateIncident, autoResolveIncident };
