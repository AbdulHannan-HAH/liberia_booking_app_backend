// controllers/roomController.js
const Room = require('../models/Room');

// @desc    Get all rooms
// @route   GET /api/hotel/rooms
// @access  Private/Admin, Hotel Staff
exports.getRooms = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            search,
            roomType,
            floor,
            sortBy = 'roomNumber',
            sortOrder = 'asc',
            checkIn,
            checkOut
        } = req.query;

        let query = { isActive: true };

        // Filter by status
        if (status && status !== 'all') {
            query.status = status;
        }

        // Filter by room type
        if (roomType) {
            query.roomType = roomType;
        }

        // Filter by floor
        if (floor) {
            query.floor = parseInt(floor);
        }

        // Search functionality
        if (search) {
            query.$or = [
                { roomNumber: { $regex: search, $options: 'i' } },
                { roomType: { $regex: search, $options: 'i' } },
                { features: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        // If checking availability for specific dates
        if (checkIn && checkOut) {
            const Reservation = require('../models/Reservation');

            const bookedReservations = await Reservation.find({
                checkIn: { $lt: new Date(checkOut) },
                checkOut: { $gt: new Date(checkIn) },
                reservationStatus: { $in: ['confirmed', 'checked_in'] }
            }).distinct('roomNumber');

            query.roomNumber = { $nin: bookedReservations };

            if (!status) {
                query.status = 'available';
            }
        }


        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get rooms
        const rooms = await Room.find(query)
            .sort(sort)
            .limit(parseInt(limit))
            .skip(skip)
            .lean();

        const total = await Room.countDocuments(query);

        res.status(200).json({
            success: true,
            count: rooms.length,
            total,
            totalPages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page),
            rooms
        });

    } catch (error) {
        console.error('Get rooms error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get single room
// @route   GET /api/hotel/rooms/:id
// @access  Private/Admin, Hotel Staff
exports.getRoom = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id).lean();

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        res.status(200).json({
            success: true,
            room
        });

    } catch (error) {
        console.error('Get room error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Create new room
// @route   POST /api/hotel/rooms
// @access  Private/Admin
exports.createRoom = async (req, res) => {
    try {
        const {
            roomNumber,
            roomType,
            floor,
            price,
            features,
            status,
            isActive = true
        } = req.body;

        // Validate required fields
        if (!roomNumber || !roomType || !floor || !price) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Check if room already exists
        const existingRoom = await Room.findOne({ roomNumber });
        if (existingRoom) {
            return res.status(400).json({
                success: false,
                message: 'Room with this number already exists'
            });
        }

        // Create room
        const room = await Room.create({
            roomNumber,
            roomType,
            floor,
            price,
            features: features || [],
            status: status || 'available',
            isActive,
            lastCleaned: new Date(),
            nextCleaning: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        });

        res.status(201).json({
            success: true,
            message: 'Room created successfully',
            room
        });

    } catch (error) {
        console.error('Create room error:', error);
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

// @desc    Update room
// @route   PUT /api/hotel/rooms/:id
// @access  Private/Admin
exports.updateRoom = async (req, res) => {
    try {
        const {
            roomNumber,
            roomType,
            floor,
            price,
            features,
            status,
            isActive
        } = req.body;

        const room = await Room.findById(req.params.id);
        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        // Update fields
        if (roomNumber) room.roomNumber = roomNumber;
        if (roomType) room.roomType = roomType;
        if (floor) room.floor = floor;
        if (price) room.price = price;
        if (features) room.features = features;
        if (status) room.status = status;
        if (isActive !== undefined) room.isActive = isActive;

        await room.save();

        res.status(200).json({
            success: true,
            message: 'Room updated successfully',
            room
        });
    } catch (error) {
        console.error('Update room error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
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

// @desc    Update room status
// @route   PUT /api/hotel/rooms/:id/status
// @access  Private/Admin, Hotel Staff
exports.updateRoomStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!status || !['available', 'occupied', 'maintenance', 'cleaning'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const room = await Room.findById(req.params.id);
        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        room.status = status;

        // Update cleaning dates if relevant
        if (status === 'cleaning') {
            room.lastCleaned = new Date();
            room.nextCleaning = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
        } else if (status === 'available') {
            room.lastCleaned = new Date();
        }

        await room.save();

        res.status(200).json({
            success: true,
            message: 'Room status updated successfully',
            room
        });

    } catch (error) {
        console.error('Update room status error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};