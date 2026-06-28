const mongoose = require('mongoose');

const apiSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'API name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    url: {
      type: String,
      required: [true, 'URL is required'],
      trim: true,
    },
    method: {
      type: String,
      required: [true, 'HTTP method is required'],
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      default: 'GET',
    },
    headers: {
      type: Map,
      of: String,
      default: {},
    },
    queryParams: {
      type: Map,
      of: String,
      default: {},
    },
    body: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    expectedStatusCode: {
      type: Number,
      default: 200,
    },
    expectedJsonFields: {
      type: [String],
      default: [],
    },
    timeout: {
      type: Number,
      default: 30000, // 30 seconds in ms
      min: [1000, 'Timeout must be at least 1 second'],
      max: [120000, 'Timeout cannot exceed 120 seconds'],
    },
    interval: {
      type: String,
      required: [true, 'Monitoring interval is required'],
      enum: ['1m', '5m', '15m', '1h'],
      default: '5m',
    },
    status: {
      type: String,
      enum: ['healthy', 'degraded', 'offline', 'unknown'],
      default: 'unknown',
    },
    lastCheckedAt: {
      type: Date,
      default: null,
    },
    lastFailedAt: {
      type: Date,
      default: null,
    },
    lastResponseTime: {
      type: Number,
      default: null,
    },
    consecutiveFailures: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
apiSchema.index({ user: 1, status: 1 });
apiSchema.index({ user: 1, name: 'text' });

module.exports = mongoose.model('Api', apiSchema);
