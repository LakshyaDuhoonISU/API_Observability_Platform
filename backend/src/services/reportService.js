const PDFDocument = require('pdfkit');
const {
  getDashboardMetrics,
  getTopSlowApis,
  getUptimeByApi,
} = require('./metricsService');
const Incident = require('../models/Incident');
const Api = require('../models/Api');
const MonitoringResult = require('../models/MonitoringResult');
const mongoose = require('mongoose');

/**
 * Generate PDF report for a user
 */
const generatePdfReport = async (userId, timeRange = '7d') => {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: 'API Observability Report',
      Author: 'API Observability Platform',
    },
  });

  const buffers = [];
  doc.on('data', (chunk) => buffers.push(chunk));

  // Colors
  const primaryColor = '#6366F1';
  const textColor = '#1F2937';
  const subtextColor = '#6B7280';
  const successColor = '#10B981';
  const dangerColor = '#EF4444';
  const warningColor = '#F59E0B';

  // Fetch data
  const [dashboardMetrics, topSlowApis, uptimeByApi] = await Promise.all([
    getDashboardMetrics(userId),
    getTopSlowApis(userId, timeRange),
    getUptimeByApi(userId, timeRange),
  ]);

  // Fetch incident summary
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const incidents = await Incident.find({ user: userObjectId })
    .sort({ createdAt: -1 })
    .limit(20);

  // Fetch most failing APIs
  const timeMap = { '24h': 24 * 60 * 60 * 1000, '7d': 7 * 24 * 60 * 60 * 1000, '30d': 30 * 24 * 60 * 60 * 1000 };
  const since = new Date(Date.now() - (timeMap[timeRange] || timeMap['7d']));

  const failingApis = await MonitoringResult.aggregate([
    { $match: { user: userObjectId, timestamp: { $gte: since }, success: false } },
    { $group: { _id: '$api', failureCount: { $sum: 1 } } },
    { $sort: { failureCount: -1 } },
    { $limit: 5 },
    { $lookup: { from: 'apis', localField: '_id', foreignField: '_id', as: 'apiInfo' } },
    { $unwind: '$apiInfo' },
    { $project: { apiName: '$apiInfo.name', failureCount: 1 } },
  ]);

  // === PAGE 1: Title & Overview ===
  doc.fontSize(28).fillColor(primaryColor).text('API Observability Report', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor(subtextColor).text(
    `Generated: ${new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })}`,
    { align: 'center' }
  );
  doc.text(`Time Range: Last ${timeRange === '24h' ? '24 Hours' : timeRange === '7d' ? '7 Days' : '30 Days'}`, { align: 'center' });

  doc.moveDown(2);

  // Divider
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(primaryColor).lineWidth(2).stroke();
  doc.moveDown(1);

  // Overview Section
  doc.fontSize(18).fillColor(primaryColor).text('Platform Overview');
  doc.moveDown(0.5);

  const metricsData = [
    ['Total APIs Monitored', `${dashboardMetrics.totalApis}`],
    ['Healthy APIs', `${dashboardMetrics.healthyApis}`],
    ['Degraded APIs', `${dashboardMetrics.degradedApis}`],
    ['Offline APIs', `${dashboardMetrics.offlineApis}`],
    ['Active Incidents', `${dashboardMetrics.activeIncidents}`],
    ['Average Response Time', `${dashboardMetrics.avgResponseTime}ms`],
    ['Average Uptime', `${dashboardMetrics.avgUptime}%`],
  ];

  for (const [label, value] of metricsData) {
    doc.fontSize(11).fillColor(textColor).text(`${label}: `, { continued: true });
    doc.fontSize(11).fillColor(primaryColor).text(value);
  }

  doc.moveDown(1.5);

  // === Most Frequently Failing APIs ===
  doc.fontSize(18).fillColor(primaryColor).text('Most Frequently Failing APIs');
  doc.moveDown(0.5);

  if (failingApis.length === 0) {
    doc.fontSize(11).fillColor(successColor).text('No failing APIs in this period!');
  } else {
    // Table header
    const tableTop = doc.y;
    doc.fontSize(10).fillColor(textColor);
    doc.text('API Name', 50, tableTop, { width: 300 });
    doc.text('Failures', 380, tableTop, { width: 100, align: 'right' });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E5E7EB').lineWidth(0.5).stroke();
    doc.moveDown(0.3);

    for (const api of failingApis) {
      doc.fontSize(10).fillColor(textColor).text(api.apiName, 50, doc.y, { width: 300 });
      doc.fillColor(dangerColor).text(`${api.failureCount}`, 380, doc.y - 12, { width: 100, align: 'right' });
      doc.moveDown(0.3);
    }
  }

  doc.moveDown(1.5);

  // === Top Slow APIs ===
  doc.fontSize(18).fillColor(primaryColor).text('Top Slow APIs');
  doc.moveDown(0.5);

  if (topSlowApis.length === 0) {
    doc.fontSize(11).fillColor(successColor).text('No data available');
  } else {
    const tableTop2 = doc.y;
    doc.fontSize(10).fillColor(textColor);
    doc.text('API Name', 50, tableTop2, { width: 300 });
    doc.text('Avg Response Time', 380, tableTop2, { width: 100, align: 'right' });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E5E7EB').lineWidth(0.5).stroke();
    doc.moveDown(0.3);

    for (const api of topSlowApis) {
      doc.fontSize(10).fillColor(textColor).text(api.apiName, 50, doc.y, { width: 300 });
      doc.fillColor(warningColor).text(`${api.avgResponseTime}ms`, 380, doc.y - 12, { width: 100, align: 'right' });
      doc.moveDown(0.3);
    }
  }

  // === PAGE 2: Incident Summary ===
  doc.addPage();
  doc.fontSize(18).fillColor(primaryColor).text('Incident Summary');
  doc.moveDown(0.5);

  if (incidents.length === 0) {
    doc.fontSize(11).fillColor(successColor).text('No incidents recorded');
  } else {
    // Table header
    doc.fontSize(9).fillColor(textColor);
    doc.text('API', 50, doc.y, { width: 120 });
    doc.text('Status', 175, doc.y - 11, { width: 70 });
    doc.text('Severity', 250, doc.y - 11, { width: 60 });
    doc.text('Started', 320, doc.y - 11, { width: 120 });
    doc.text('Duration', 450, doc.y - 11, { width: 80, align: 'right' });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E5E7EB').lineWidth(0.5).stroke();
    doc.moveDown(0.3);

    for (const incident of incidents) {
      const duration = incident.duration
        ? `${Math.round(incident.duration / 60)}min`
        : 'Ongoing';

      const statusColor = {
        open: dangerColor,
        investigating: warningColor,
        resolved: successColor,
        closed: subtextColor,
      };

      doc.fontSize(8).fillColor(textColor).text(
        incident.apiName.substring(0, 20),
        50, doc.y, { width: 120 }
      );
      const rowY = doc.y - 9;
      doc.fillColor(statusColor[incident.status] || textColor).text(
        incident.status, 175, rowY, { width: 70 }
      );
      doc.fillColor(textColor).text(incident.severity, 250, rowY, { width: 60 });
      doc.text(
        new Date(incident.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        320, rowY, { width: 120 }
      );
      doc.text(duration, 450, rowY, { width: 80, align: 'right' });
      doc.moveDown(0.3);

      // Break page if needed
      if (doc.y > 700) {
        doc.addPage();
      }
    }
  }

  doc.moveDown(1.5);

  // === Uptime by API ===
  doc.fontSize(18).fillColor(primaryColor).text('Uptime by API');
  doc.moveDown(0.5);

  if (uptimeByApi.length === 0) {
    doc.fontSize(11).fillColor(subtextColor).text('No uptime data available');
  } else {
    for (const api of uptimeByApi) {
      const uptimeColor = api.uptime >= 99 ? successColor : api.uptime >= 95 ? warningColor : dangerColor;
      doc.fontSize(10).fillColor(textColor).text(`${api.apiName}: `, { continued: true });
      doc.fillColor(uptimeColor).text(`${api.uptime}%`);
    }
  }

  // Footer
  doc.moveDown(2);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(primaryColor).lineWidth(1).stroke();
  doc.moveDown(0.5);
  doc.fontSize(8).fillColor(subtextColor).text(
    'Generated by API Observability Platform',
    { align: 'center' }
  );

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
  });
};

module.exports = { generatePdfReport };
