const express = require('express');
const { protect } = require('../utils/auth');
const { generatePdfReport } = require('../services/reportService');

const router = express.Router();

router.use(protect);

// GET /api/reports/generate - Generate PDF report
router.get('/generate', async (req, res, next) => {
  try {
    const { timeRange = '7d' } = req.query;

    const pdfBuffer = await generatePdfReport(req.user._id, timeRange);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=api-observability-report-${timeRange}-${Date.now()}.pdf`
    );
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
