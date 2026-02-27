const express = require('express');
const router = express.Router();
const {
    getMenuItems,
    getMenuItem,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    initializeMenuItems
} = require('../controllers/menuItemController');
const {
    getSales,
    getSale,
    createSale,
    updateSale,
    deleteSale,
    updatePaymentStatus,
    updateOrderStatus
} = require('../controllers/saleController');
const {
    getDashboardStats,
    getReports
} = require('../controllers/restaurantReportsController');
const {
    getCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory,
    initializeCategories
} = require('../controllers/categoryController');
const { auth, authorize } = require('../middlewares/auth');

// Apply authentication to all routes
router.use(auth);

// Dashboard
router.get('/dashboard', authorize(['admin', 'restaurant_staff']), getDashboardStats);

// Reports
router.get('/reports', authorize(['admin', 'restaurant_staff']), getReports);

// Category Routes
router.get('/categories', authorize(['admin', 'restaurant_staff']), getCategories);
router.get('/categories/:id', authorize(['admin', 'restaurant_staff']), getCategory);
router.post('/categories', authorize(['admin']), createCategory);
router.put('/categories/:id', authorize(['admin']), updateCategory);
router.delete('/categories/:id', authorize(['admin']), deleteCategory);
router.post('/categories/initialize', authorize(['admin']), initializeCategories);

// Menu Items Routes
router.get('/menu-items', authorize(['admin', 'restaurant_staff']), getMenuItems);
router.get('/menu-items/:id', authorize(['admin', 'restaurant_staff']), getMenuItem);
router.post('/menu-items', authorize(['admin']), createMenuItem);
router.put('/menu-items/:id', authorize(['admin']), updateMenuItem);
router.delete('/menu-items/:id', authorize(['admin']), deleteMenuItem);
router.post('/menu-items/initialize', authorize(['admin']), initializeMenuItems);

// Sales Routes
router.get('/sales', authorize(['admin', 'restaurant_staff']), getSales);
router.get('/sales/:id', authorize(['admin', 'restaurant_staff']), getSale);
router.post('/sales', authorize(['admin', 'restaurant_staff']), createSale);
router.put('/sales/:id', authorize(['admin', 'restaurant_staff']), updateSale);
router.delete('/sales/:id', authorize(['admin']), deleteSale);
router.put('/sales/:id/payment-status', authorize(['admin', 'restaurant_staff']), updatePaymentStatus);
router.put('/sales/:id/order-status', authorize(['admin', 'restaurant_staff']), updateOrderStatus);

module.exports = router;