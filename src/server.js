const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const errorHandler = require('./middlewares/errorHandler');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

// Initialize express
const app = express();

// =======================
// Middleware
// =======================
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:8080',
        'http://localhost:8081'
    ],
    credentials: true
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
    console.log(`${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
    next();
});

// =======================
// Routes
// =======================
app.use('/api', require('./routes/index'));

// =======================
// Error Handling
// =======================

// Custom error handler (must be before 404)
app.use(errorHandler);

// 404 handler (EXPRESS 5 SAFE ✅)
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});

// =======================
// Server Start
// =======================
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(
        `Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`
    );
});

// =======================
// Process Error Handling
// =======================

// Unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed.');
    });
});