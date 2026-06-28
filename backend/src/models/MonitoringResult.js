const mongoose = require('mongoose');

const monitoringResultSchema = new mongoose.Schema(
  {
    api: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Api',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    statusCode: {
      type: Number,
      default: null,
    },
    responseTime: {
      type: Number, // in milliseconds
      default: null,
    },
    success: {
      type: Boolean,
      required: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    responseBody: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    responseHeaders: {
      type: Map,
      of: String,
      default: {},
    },
    contentType: {
      type: String,
      default: null,
    },
    validationErrors: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient time-range queries
monitoringResultSchema.index({ api: 1, timestamp: -1 });
monitoringResultSchema.index({ user: 1, timestamp: -1 });
monitoringResultSchema.index({ api: 1, success: 1, timestamp: -1 });

module.exports = mongoose.model('MonitoringResult', monitoringResultSchema);
