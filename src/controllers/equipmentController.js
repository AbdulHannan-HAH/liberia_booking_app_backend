const Equipment = require('../models/Equipment');

// @desc    Get all equipment
// @route   GET /api/conference/equipment
// @access  Private/Admin, Conference Staff
exports.getEquipment = async (req, res) => {
    try {
        const equipment = await Equipment.find({ isActive: true })
            .sort({ category: 1, name: 1 })
            .lean();

        res.status(200).json({
            success: true,
            equipment
        });
    } catch (error) {
        console.error('Get equipment error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update equipment
// @route   PUT /api/conference/equipment/:id
// @access  Private/Admin
exports.updateEquipment = async (req, res) => {
    try {
        const { name, category, quantity, availableQuantity, rentalRate, unit, description, isActive } = req.body;

        const equipment = await Equipment.findById(req.params.id);
        if (!equipment) {
            return res.status(404).json({
                success: false,
                message: 'Equipment not found'
            });
        }

        if (name) equipment.name = name;
        if (category) equipment.category = category;
        if (quantity !== undefined) equipment.quantity = quantity;
        if (availableQuantity !== undefined) equipment.availableQuantity = availableQuantity;
        if (rentalRate !== undefined) equipment.rentalRate = rentalRate;
        if (unit) equipment.unit = unit;
        if (description !== undefined) equipment.description = description;
        if (isActive !== undefined) equipment.isActive = isActive;

        await equipment.save();

        res.status(200).json({
            success: true,
            message: 'Equipment updated successfully',
            equipment
        });
    } catch (error) {
        console.error('Update equipment error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Equipment not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Create equipment
// @route   POST /api/conference/equipment
// @access  Private/Admin
exports.createEquipment = async (req, res) => {
    try {
        const equipment = await Equipment.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Equipment created successfully',
            equipment
        });
    } catch (error) {
        console.error('Create equipment error:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};