const express = require('express');
const router = express.Router();
const {
    getAllUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    changePassword
} = require('../controllers/userCOntroller');
const { auth, authorize } = require('../middlewares/auth');

// Apply authentication to all routes
router.use(auth);

// Apply admin authorization to all routes
router.use(authorize('admin'));

// @route   GET /api/users
// @desc    Get all users
// @access  Private/Admin
router.get('/', getAllUsers);

// @route   GET /api/users/:id
// @desc    Get single user
// @access  Private/Admin
router.get('/:id', getUser);

// @route   POST /api/users
// @desc    Create new user
// @access  Private/Admin
router.post('/', createUser);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private/Admin
router.put('/:id', updateUser);

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private/Admin
router.delete('/:id', deleteUser);

// @route   PUT /api/users/:id/change-password
// @desc    Change user password
// @access  Private/Admin
router.put('/:id/change-password', changePassword);

module.exports = router;