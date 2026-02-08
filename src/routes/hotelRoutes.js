// src/routes/hotelRoutes.js
const express = require('express');
const router = express.Router();
const {
    getReservations,
    getReservation,
    createReservation,
    updateReservation,
    updateReservationStatus,
    updatePaymentStatus,
    checkIn,
    checkOut,
    deleteReservation,
    getDashboardStats,
    getReports,
    initializeDefaults
} = require('../controllers/hotelController');
const {
    getRooms,
    getRoom,
    createRoom,
    updateRoom,
    updateRoomStatus
} = require('../controllers/roomController');
const {
    getRoomTypes,
    createRoomType,
    updateRoomType,
    initializeRoomTypes
} = require('../controllers/roomTypeController');
const {
    getServices,
    updateService,
    createService,
    initializeServices
} = require('../controllers/serviceController');
const { auth, authorize } = require('../middlewares/auth');

// Apply authentication to all routes
router.use(auth);

// Routes accessible by both admin and hotel_staff
router.get('/dashboard', authorize(['admin', 'hotel_staff']), getDashboardStats);
router.get('/reports', authorize(['admin', 'hotel_staff']), getReports);
router.get('/reservations', authorize(['admin', 'hotel_staff']), getReservations);
router.get('/reservations/:id', authorize(['admin', 'hotel_staff']), getReservation);
router.post('/reservations', authorize(['admin', 'hotel_staff']), createReservation);
router.put('/reservations/:id', authorize(['admin', 'hotel_staff']), updateReservation);
router.put('/reservations/:id/status', authorize(['admin', 'hotel_staff']), updateReservationStatus);
router.put('/reservations/:id/payment', authorize(['admin', 'hotel_staff']), updatePaymentStatus);
router.put('/reservations/:id/checkin', authorize(['admin', 'hotel_staff']), checkIn);
router.put('/reservations/:id/checkout', authorize(['admin', 'hotel_staff']), checkOut);
router.get('/rooms', authorize(['admin', 'hotel_staff']), getRooms);
router.get('/rooms/:id', authorize(['admin', 'hotel_staff']), getRoom);
router.put('/rooms/:id/status', authorize(['admin', 'hotel_staff']), updateRoomStatus);
router.get('/room-types', authorize(['admin', 'hotel_staff']), getRoomTypes);
router.get('/services', authorize(['admin', 'hotel_staff']), getServices);

// Admin only routes
router.delete('/reservations/:id', authorize(['admin']), deleteReservation);
router.post('/rooms', authorize(['admin']), createRoom);
router.put('/rooms/:id', authorize(['admin']), updateRoom);
router.post('/room-types', authorize(['admin']), createRoomType);
router.put('/room-types/:id', authorize(['admin']), updateRoomType);
router.post('/room-types/initialize', authorize(['admin']), initializeRoomTypes);
router.put('/services/:id', authorize(['admin']), updateService);
router.post('/services', authorize(['admin']), createService);
router.post('/services/initialize', authorize(['admin']), initializeServices);
router.post('/initialize-defaults', authorize(['admin']), initializeDefaults);

module.exports = router;