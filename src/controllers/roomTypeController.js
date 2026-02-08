// src/controllers/roomTypeController.js - UPDATED
const RoomType = require('../models/RoomType');

// @desc    Get all room types
// @route   GET /api/hotel/room-types
// @access  Private/Admin, Hotel Staff
exports.getRoomTypes = async (req, res) => {
    try {
        const roomTypes = await RoomType.find({ isActive: true })
            .sort({ basePrice: 1 })
            .lean();

        res.status(200).json({
            success: true,
            roomTypes
        });
    } catch (error) {
        console.error('Get room types error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Create new room type
// @route   POST /api/hotel/room-types
// @access  Private/Admin
exports.createRoomType = async (req, res) => {
    try {
        const {
            name,
            description,
            basePrice,
            maxOccupancy,
            amenities,
            isActive = true
        } = req.body;

        // Validate required fields
        if (!name || !description || !basePrice || !maxOccupancy) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Check if room type already exists
        const existingRoomType = await RoomType.findOne({ name });
        if (existingRoomType) {
            return res.status(400).json({
                success: false,
                message: 'Room type with this name already exists'
            });
        }

        // Create room type
        const roomType = await RoomType.create({
            name,
            description,
            basePrice,
            maxOccupancy,
            amenities: amenities || [],
            isActive
        });

        res.status(201).json({
            success: true,
            message: 'Room type created successfully',
            roomType
        });

    } catch (error) {
        console.error('Create room type error:', error);
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

// @desc    Update room type
// @route   PUT /api/hotel/room-types/:id
// @access  Private/Admin
exports.updateRoomType = async (req, res) => {
    try {
        const {
            name,
            description,
            basePrice,
            maxOccupancy,
            amenities,
            isActive
        } = req.body;

        const roomType = await RoomType.findById(req.params.id);
        if (!roomType) {
            return res.status(404).json({
                success: false,
                message: 'Room type not found'
            });
        }

        // Update fields
        if (name) roomType.name = name;
        if (description) roomType.description = description;
        if (basePrice) roomType.basePrice = basePrice;
        if (maxOccupancy) roomType.maxOccupancy = maxOccupancy;
        if (amenities) roomType.amenities = amenities;
        if (isActive !== undefined) roomType.isActive = isActive;

        await roomType.save();

        res.status(200).json({
            success: true,
            message: 'Room type updated successfully',
            roomType
        });
    } catch (error) {
        console.error('Update room type error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Room type not found'
            });
        }
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

// @desc    Initialize default room types
// @route   POST /api/hotel/room-types/initialize
// @access  Private/Admin
exports.initializeRoomTypes = async (req, res) => {
    try {
        const defaultRoomTypes = [
            {
                name: 'Standard Room',
                description: 'Comfortable room with basic amenities',
                basePrice: 80,
                maxOccupancy: 2,
                amenities: ['Wi-Fi', 'TV', 'AC', 'Mini-bar', 'Tea/Coffee Maker']
            },
            {
                name: 'Deluxe Room',
                description: 'Spacious room with premium amenities',
                basePrice: 120,
                maxOccupancy: 3,
                amenities: ['Wi-Fi', 'TV', 'AC', 'Mini-bar', 'Tea/Coffee Maker', 'Safe', 'Work Desk']
            },
            {
                name: 'Suite',
                description: 'Luxurious suite with separate living area',
                basePrice: 200,
                maxOccupancy: 4,
                amenities: ['Wi-Fi', 'TV', 'AC', 'Mini-bar', 'Tea/Coffee Maker', 'Safe', 'Work Desk', 'Living Room', 'Jacuzzi']
            },
            {
                name: 'Family Room',
                description: 'Perfect for families with children',
                basePrice: 150,
                maxOccupancy: 5,
                amenities: ['Wi-Fi', 'TV', 'AC', 'Mini-bar', 'Tea/Coffee Maker', 'Extra Bed', 'Play Area']
            }
        ];

        const results = [];
        for (const roomTypeData of defaultRoomTypes) {
            const existing = await RoomType.findOne({ name: roomTypeData.name });
            if (!existing) {
                const roomType = await RoomType.create(roomTypeData);
                results.push(roomType);
            } else {
                // Update existing
                Object.assign(existing, roomTypeData);
                await existing.save();
                results.push(existing);
            }
        }

        res.status(200).json({
            success: true,
            message: 'Room types initialized',
            initialized: results.length,
            roomTypes: results
        });
    } catch (error) {
        console.error('Initialize room types error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};