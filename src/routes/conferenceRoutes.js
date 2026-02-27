// routes/conferenceRoutes.js
const express = require('express');
const router = express.Router();
const {
    getBookings,
    getBooking,
    createBooking,
    updateBooking,
    updateBookingStatus,
    updatePaymentStatus,
    deleteBooking,
    getDashboardStats,
    getReports
} = require('../controllers/conferenceController');
const {
    getConferenceHalls,
    updateConferenceHall,
    initializeConferenceHalls
} = require('../controllers/conferenceHallController');
const {
    getEquipment,
    updateEquipment,
    createEquipment
} = require('../controllers/equipmentController');
const { auth, authorize } = require('../middlewares/auth');

// Apply authentication to all routes
router.use(auth);

// ============================================
// ROUTES ACCESSIBLE BY BOTH ADMIN AND CONFERENCE STAFF
// ============================================

// Bookings routes - YAHAN 'conference_staff' ALLOWED HONA CHAHIYE
router.get('/bookings', authorize(['admin', 'conference_staff']), getBookings);
router.get('/bookings/:id', authorize(['admin', 'conference_staff']), getBooking);
router.post('/bookings', authorize(['admin', 'conference_staff']), createBooking);
router.put('/bookings/:id', authorize(['admin', 'conference_staff']), updateBooking);
router.put('/bookings/:id/status', authorize(['admin', 'conference_staff']), updateBookingStatus);
router.put('/bookings/:id/payment', authorize(['admin', 'conference_staff']), updatePaymentStatus);

// Halls routes (Settings ke liye)
router.get('/halls', authorize(['admin', 'conference_staff']), getConferenceHalls);
router.put('/halls/:id', authorize(['admin', 'conference_staff']), updateConferenceHall);

// Equipment routes
router.get('/equipment', authorize(['admin', 'conference_staff']), getEquipment);

// ============================================
// ADMIN ONLY ROUTES (STAFF KO NAHI CHAHIYE)
// ============================================

// Dashboard (ADMIN ONLY)
router.get('/dashboard', authorize(['admin']), getDashboardStats);

// Reports (ADMIN ONLY)
router.get('/reports', authorize(['admin']), getReports);

// Delete booking (ADMIN ONLY)
router.delete('/bookings/:id', authorize(['admin']), deleteBooking);

// Initialize halls (ADMIN ONLY - setup ke liye)
router.post('/halls/initialize', authorize(['admin']), initializeConferenceHalls);

// Equipment management (ADMIN ONLY)
router.put('/equipment/:id', authorize(['admin']), updateEquipment);
router.post('/equipment', authorize(['admin']), createEquipment);

module.exports = router;