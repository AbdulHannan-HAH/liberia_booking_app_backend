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

// Routes accessible by both admin and conference_staff
router.get('/bookings', authorize(['admin', 'conference_staff']), getBookings);
router.get('/bookings/:id', authorize(['admin', 'conference_staff']), getBooking);
router.post('/bookings', authorize(['admin', 'conference_staff']), createBooking);
router.put('/bookings/:id', authorize(['admin', 'conference_staff']), updateBooking);
router.put('/bookings/:id/status', authorize(['admin', 'conference_staff']), updateBookingStatus);
router.put('/bookings/:id/payment', authorize(['admin', 'conference_staff']), updatePaymentStatus);
router.get('/dashboard', authorize(['admin', 'conference_staff']), getDashboardStats);
router.get('/reports', authorize(['admin', 'conference_staff']), getReports);
router.get('/halls', authorize(['admin', 'conference_staff']), getConferenceHalls);
router.get('/equipment', authorize(['admin', 'conference_staff']), getEquipment);

// Admin only routes
router.delete('/bookings/:id', authorize(['admin']), deleteBooking);
router.put('/halls/:id', authorize(['admin']), updateConferenceHall);
router.post('/halls/initialize', authorize(['admin']), initializeConferenceHalls);
router.put('/equipment/:id', authorize(['admin']), updateEquipment);
router.post('/equipment', authorize(['admin']), createEquipment);

module.exports = router;