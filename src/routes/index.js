const express = require('express');
const router = express.Router();

// Import route files
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const poolRoutes = require('./poolRoutes');

// Route: /api/auth
router.use('/auth', authRoutes);

// Route: /api/users
router.use('/users', userRoutes);

// Route: /api/pool
router.use('/pool', poolRoutes);

// Test route
router.get('/test', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API is working!',
        timestamp: new Date().toISOString()
    });
});

// Health check
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'healthy',
        service: 'Pool Management System API',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;