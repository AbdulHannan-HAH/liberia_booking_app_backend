const express = require('express');
const router = express.Router();
const {
    getBookings,
    getBooking,
    createBooking,
    updateBooking,
    deleteBooking,
    updatePaymentStatus,
    getDashboardStats,
    getReports
} = require('../controllers/poolController');
const {
    getTicketPrices,
    updateTicketPrice,
    initializeTicketPrices
} = require('../controllers/ticketPriceController');
const {
    getTimeSlots,
    updateTimeSlot,
    initializeTimeSlots
} = require('../controllers/timeSlotController');
const { auth, authorize } = require('../middlewares/auth');

// Apply authentication to all routes
router.use(auth);

// Routes accessible by both admin and pool_staff
router.get('/bookings', authorize(['admin', 'pool_staff']), getBookings);
router.get('/bookings/:id', authorize(['admin', 'pool_staff']), getBooking);
router.post('/bookings', authorize(['admin', 'pool_staff']), createBooking);
router.put('/bookings/:id', authorize(['admin', 'pool_staff']), updateBooking);
router.put('/bookings/:id/status', authorize(['admin', 'pool_staff']), updatePaymentStatus);
router.get('/dashboard', authorize(['admin', 'pool_staff']), getDashboardStats);
router.get('/reports', authorize(['admin', 'pool_staff']), getReports);
router.get('/ticket-prices', authorize(['admin', 'pool_staff']), getTicketPrices);
router.get('/time-slots', authorize(['admin', 'pool_staff']), getTimeSlots);

// Admin only routes - only admin can modify settings
router.delete('/bookings/:id', authorize(['admin']), deleteBooking);
router.put('/ticket-prices/:id', authorize(['admin']), updateTicketPrice);
router.post('/ticket-prices/initialize', authorize(['admin']), initializeTicketPrices);
router.put('/time-slots/:id', authorize(['admin']), updateTimeSlot);
router.post('/time-slots/initialize', authorize(['admin']), initializeTimeSlots);

module.exports = router;