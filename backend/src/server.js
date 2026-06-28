require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./database/connection');
const { errorHandler } = require('./utils/errorHandler');
const { initializeScheduler, stopAllJobs } = require('./services/scheduler');

// Import routes
const authRoutes = require('./api/auth');
const apiRoutes = require('./api/apis');
const monitoringRoutes = require('./api/monitoring');
const incidentRoutes = require('./api/incidents');
const reportRoutes = require('./api/reports');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/apis', apiRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/reports', reportRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Observability Platform is running',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use(errorHandler);

// Start server
const start = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 API Observability Platform - Backend`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health\n`);
    });

    // Initialize monitoring scheduler after DB connection
    await initializeScheduler();
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  stopAllJobs();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received. Shutting down gracefully...');
  stopAllJobs();
  process.exit(0);
});

start();
