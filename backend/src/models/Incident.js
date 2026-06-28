const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
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
    apiName: {
      type: String,
      required: true,
    },
    apiUrl: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'investigating', 'resolved', 'closed'],
      default: 'open',
    },
    severity: {
      type: String,
      enum: ['critical', 'major', 'minor'],
      default: 'major',
    },
    failureReason: {
      type: String,
      required: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number, // in seconds
      default: null,
    },
    failureCount: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
incidentSchema.index({ user: 1, status: 1 });
incidentSchema.index({ api: 1, status: 1 });
incidentSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Incident', incidentSchema);
