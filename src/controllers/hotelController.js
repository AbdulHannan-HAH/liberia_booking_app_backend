// controllers/hotelController.js - UPDATED (NO TAX + REAL-TIME REPORTS)
const Reservation = require('../models/Reservation');
const Room = require('../models/Room');
const RoomType = require('../models/RoomType');

// @desc    Get all reservations with filters
// @route   GET /api/hotel/reservations
// @access  Private/Admin, Hotel Staff
exports.getReservations = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            search,
            sortBy = 'checkIn',
            sortOrder = 'desc'
        } = req.query;

        const query = {};

        // Filter by status
        if (status && status !== 'all') {
            query.reservationStatus = status;
        }

        // Search functionality
        if (search) {
            query.$or = [
                { guestName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { reservationNumber: { $regex: search, $options: 'i' } },
                { roomNumber: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get reservations with population
        const reservations = await Reservation.find(query)
            .sort(sort)
            .limit(parseInt(limit))
            .skip(skip)
            .populate('createdBy', 'name email')
            .lean();

        const total = await Reservation.countDocuments(query);

        res.status(200).json({
            success: true,
            count: reservations.length,
            total,
            totalPages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page),
            reservations
        });

    } catch (error) {
        console.error('Get reservations error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get single reservation
// @route   GET /api/hotel/reservations/:id
// @access  Private/Admin, Hotel Staff
exports.getReservation = async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id)
            .populate('createdBy', 'name email')
            .lean();

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found'
            });
        }

        res.status(200).json({
            success: true,
            reservation
        });

    } catch (error) {
        console.error('Get reservation error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Create new reservation (NO TAX)
// @route   POST /api/hotel/reservations
// @access  Private/Admin, Hotel Staff
exports.createReservation = async (req, res) => {
    try {
        console.log('🏨 Creating new hotel reservation...');
        console.log('Request body:', req.body);

        const {
            guestName,
            email,
            phone,
            checkIn,
            checkOut,
            roomType,
            roomNumber,
            adults,
            children,
            paymentStatus,
            specialRequests,
            totalAmount,
            extraCharges = []
        } = req.body;

        // Validate required fields
        if (!guestName || !phone || !checkIn || !checkOut || !roomType || !roomNumber || !adults) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Check room availability
        const room = await Room.findOne({ roomNumber });
        if (!room || room.status !== 'available') {
            return res.status(400).json({
                success: false,
                message: 'Selected room is not available'
            });
        }

        // Check for overlapping reservations
        const overlappingReservations = await Reservation.find({
            roomNumber,
            $or: [
                {
                    checkIn: { $lt: new Date(checkOut) },
                    checkOut: { $gt: new Date(checkIn) }
                }
            ],
            reservationStatus: { $in: ['confirmed', 'checked_in'] }
        });

        if (overlappingReservations.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Room is already booked for selected dates'
            });
        }

        // Get room type for pricing
        const roomTypeInfo = await RoomType.findOne({ name: roomType });
        if (!roomTypeInfo) {
            return res.status(400).json({
                success: false,
                message: 'Invalid room type'
            });
        }

        // Calculate nights and amount
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

        if (nights <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Check-out date must be after check-in date'
            });
        }

        const roomRate = roomTypeInfo.basePrice;
        const roomTotal = roomRate * nights;

        // Calculate services total
        let servicesTotal = 0;
        if (extraCharges && extraCharges.length > 0) {
            servicesTotal = extraCharges.reduce((sum, charge) => {
                return sum + (charge.amount * (charge.quantity || 1));
            }, 0);
        }

        const subTotal = roomTotal + servicesTotal;
        const tax = 0; // No tax as per requirement
        const finalTotalAmount = subTotal + tax;

        // Generate reservation number
        const reservationCount = await Reservation.countDocuments();
        const reservationNumber = `HR-${Date.now().toString().slice(-6)}-${reservationCount + 1}`;

        // Create reservation
        const reservation = await Reservation.create({
            guestName,
            email: email || '',
            phone,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            roomType,
            roomNumber,
            adults: parseInt(adults),
            children: parseInt(children || 0),
            totalNights: nights,
            roomRate,
            extraCharges: extraCharges.map(charge => ({
                service: charge.service,
                amount: charge.amount,
                quantity: charge.quantity || 1
            })),
            subTotal,
            tax,
            totalAmount: finalTotalAmount,
            paymentStatus: paymentStatus || 'pending',
            reservationStatus: 'confirmed',
            specialRequests: specialRequests || '',
            reservationNumber,
            createdBy: req.user._id
        });

        // Update room status
        room.status = 'occupied';
        await room.save();

        console.log('✅ Reservation created:', reservation.reservationNumber);

        // Populate createdBy info
        const populatedReservation = await Reservation.findById(reservation._id)
            .populate('createdBy', 'name email')
            .lean();

        res.status(201).json({
            success: true,
            message: 'Reservation created successfully',
            reservation: populatedReservation
        });

    } catch (error) {
        console.error('Create reservation error:', error);
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

// @desc    Update reservation
// @route   PUT /api/hotel/reservations/:id
// @access  Private/Admin, Hotel Staff
exports.updateReservation = async (req, res) => {
    try {
        const {
            guestName,
            email,
            phone,
            checkIn,
            checkOut,
            roomNumber,
            adults,
            children,
            paymentStatus,
            specialRequests
        } = req.body;

        // Find reservation
        const reservation = await Reservation.findById(req.params.id);
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found'
            });
        }

        // Store old values
        const oldRoomNumber = reservation.roomNumber;
        const oldCheckIn = reservation.checkIn;
        const oldCheckOut = reservation.checkOut;

        // Update fields
        if (guestName) reservation.guestName = guestName;
        if (email) reservation.email = email;
        if (phone) reservation.phone = phone;
        if (checkIn) reservation.checkIn = new Date(checkIn);
        if (checkOut) reservation.checkOut = new Date(checkOut);
        if (roomNumber) reservation.roomNumber = roomNumber;
        if (adults) reservation.adults = parseInt(adults);
        if (children !== undefined) reservation.children = parseInt(children);
        if (paymentStatus) reservation.paymentStatus = paymentStatus;
        if (specialRequests !== undefined) reservation.specialRequests = specialRequests;

        // Handle room change or date change
        if (roomNumber !== oldRoomNumber || checkIn || checkOut) {
            // Free up old room
            const oldRoom = await Room.findOne({ roomNumber: oldRoomNumber });
            if (oldRoom && reservation.reservationStatus === 'confirmed') {
                // Check if there are no other confirmed reservations for this room
                const otherReservations = await Reservation.find({
                    _id: { $ne: reservation._id },
                    roomNumber: oldRoomNumber,
                    $or: [
                        {
                            checkIn: { $lt: oldCheckOut },
                            checkOut: { $gt: oldCheckIn }
                        }
                    ],
                    reservationStatus: { $in: ['confirmed', 'checked_in'] }
                });

                if (otherReservations.length === 0) {
                    oldRoom.status = 'available';
                    await oldRoom.save();
                }
            }

            // Check new room availability
            const newRoom = await Room.findOne({ roomNumber: reservation.roomNumber });
            if (!newRoom || newRoom.status !== 'available') {
                return res.status(400).json({
                    success: false,
                    message: 'Selected room is not available'
                });
            }

            // Check for overlapping reservations in new room
            const overlappingReservations = await Reservation.find({
                _id: { $ne: reservation._id },
                roomNumber: reservation.roomNumber,
                $or: [
                    {
                        checkIn: { $lt: reservation.checkOut },
                        checkOut: { $gt: reservation.checkIn }
                    }
                ],
                reservationStatus: { $in: ['confirmed', 'checked_in'] }
            });

            if (overlappingReservations.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Room is already booked for selected dates'
                });
            }

            // Update new room status
            if (reservation.reservationStatus === 'confirmed') {
                newRoom.status = 'occupied';
                await newRoom.save();
            }
        }

        // Recalculate amount if dates changed
        if (checkIn || checkOut) {
            const nights = Math.ceil((reservation.checkOut - reservation.checkIn) / (1000 * 60 * 60 * 24));
            reservation.totalNights = nights;
            reservation.subTotal = reservation.roomRate * nights;
            reservation.tax = 0; // No tax
            reservation.totalAmount = reservation.subTotal + reservation.tax;
        }

        await reservation.save();

        // Get updated reservation with populated data
        const updatedReservation = await Reservation.findById(reservation._id)
            .populate('createdBy', 'name email')
            .lean();

        res.status(200).json({
            success: true,
            message: 'Reservation updated successfully',
            reservation: updatedReservation
        });

    } catch (error) {
        console.error('Update reservation error:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update reservation status
// @route   PUT /api/hotel/reservations/:id/status
// @access  Private/Admin, Hotel Staff
exports.updateReservationStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!status || !['confirmed', 'cancelled', 'no_show'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const reservation = await Reservation.findById(req.params.id);
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found'
            });
        }

        // Handle room status based on reservation status change
        const room = await Room.findOne({ roomNumber: reservation.roomNumber });

        if (status === 'cancelled' && reservation.reservationStatus !== 'cancelled') {
            // Free up room if cancelled
            if (room) {
                // Check if there are no other confirmed reservations for this room during this period
                const otherReservations = await Reservation.find({
                    _id: { $ne: reservation._id },
                    roomNumber: reservation.roomNumber,
                    $or: [
                        {
                            checkIn: { $lt: reservation.checkOut },
                            checkOut: { $gt: reservation.checkIn }
                        }
                    ],
                    reservationStatus: { $in: ['confirmed', 'checked_in'] }
                });

                if (otherReservations.length === 0) {
                    room.status = 'available';
                    await room.save();
                }
            }
        } else if (status === 'confirmed' && reservation.reservationStatus === 'cancelled') {
            // Re-occupy room if changing from cancelled to confirmed
            if (room && room.status === 'available') {
                // Check if room is still available for the dates
                const overlappingReservations = await Reservation.find({
                    _id: { $ne: reservation._id },
                    roomNumber: reservation.roomNumber,
                    $or: [
                        {
                            checkIn: { $lt: reservation.checkOut },
                            checkOut: { $gt: reservation.checkIn }
                        }
                    ],
                    reservationStatus: { $in: ['confirmed', 'checked_in'] }
                });

                if (overlappingReservations.length === 0) {
                    room.status = 'occupied';
                    await room.save();
                } else {
                    return res.status(400).json({
                        success: false,
                        message: 'Room is no longer available for selected dates'
                    });
                }
            }
        }

        reservation.reservationStatus = status;
        await reservation.save();

        const updatedReservation = await Reservation.findById(reservation._id)
            .populate('createdBy', 'name email')
            .lean();

        res.status(200).json({
            success: true,
            message: 'Reservation status updated successfully',
            reservation: updatedReservation
        });

    } catch (error) {
        console.error('Update reservation status error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update payment status
// @route   PUT /api/hotel/reservations/:id/payment
// @access  Private/Admin, Hotel Staff
exports.updatePaymentStatus = async (req, res) => {
    try {
        const { paymentStatus } = req.body;

        if (!paymentStatus || !['paid', 'pending', 'partial'].includes(paymentStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment status'
            });
        }

        const reservation = await Reservation.findById(req.params.id);
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found'
            });
        }

        reservation.paymentStatus = paymentStatus;
        await reservation.save();

        res.status(200).json({
            success: true,
            message: 'Payment status updated successfully',
            reservation
        });

    } catch (error) {
        console.error('Update payment status error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Check-in guest
// @route   PUT /api/hotel/reservations/:id/checkin
// @access  Private/Admin, Hotel Staff
exports.checkIn = async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id);
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found'
            });
        }

        if (reservation.reservationStatus !== 'confirmed') {
            return res.status(400).json({
                success: false,
                message: 'Only confirmed reservations can be checked in'
            });
        }

        // Update reservation status
        reservation.reservationStatus = 'checked_in';
        reservation.actualCheckIn = new Date();
        await reservation.save();

        res.status(200).json({
            success: true,
            message: 'Guest checked in successfully',
            reservation
        });

    } catch (error) {
        console.error('Check-in error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Check-out guest
// @route   PUT /api/hotel/reservations/:id/checkout
// @access  Private/Admin, Hotel Staff
exports.checkOut = async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id);
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found'
            });
        }

        if (reservation.reservationStatus !== 'checked_in') {
            return res.status(400).json({
                success: false,
                message: 'Only checked-in guests can check out'
            });
        }

        // Check if payment is pending
        if (reservation.paymentStatus === 'pending' || reservation.paymentStatus === 'partial') {
            return res.status(400).json({
                success: false,
                message: 'Cannot check out with pending payment. Please update payment status to "paid" first.'
            });
        }

        // Update reservation status
        reservation.reservationStatus = 'checked_out';
        reservation.actualCheckOut = new Date();
        await reservation.save();

        // Free up the room
        const room = await Room.findOne({ roomNumber: reservation.roomNumber });
        if (room) {
            room.status = 'cleaning'; // Room needs cleaning before being available again
            await room.save();
        }

        res.status(200).json({
            success: true,
            message: 'Guest checked out successfully',
            reservation
        });

    } catch (error) {
        console.error('Check-out error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Delete reservation
// @route   DELETE /api/hotel/reservations/:id
// @access  Private/Admin
exports.deleteReservation = async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found'
            });
        }

        // Free up room if reservation was active
        if (reservation.reservationStatus === 'confirmed' || reservation.reservationStatus === 'checked_in') {
            const room = await Room.findOne({ roomNumber: reservation.roomNumber });
            if (room) {
                // Check if there are no other reservations for this room during this period
                const otherReservations = await Reservation.find({
                    _id: { $ne: reservation._id },
                    roomNumber: reservation.roomNumber,
                    $or: [
                        {
                            checkIn: { $lt: reservation.checkOut },
                            checkOut: { $gt: reservation.checkIn }
                        }
                    ],
                    reservationStatus: { $in: ['confirmed', 'checked_in'] }
                });

                if (otherReservations.length === 0) {
                    room.status = 'available';
                    await room.save();
                }
            }
        }

        await reservation.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Reservation deleted successfully'
        });

    } catch (error) {
        console.error('Delete reservation error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get dashboard stats
// @route   GET /api/hotel/dashboard
// @access  Private/Admin, Hotel Staff
exports.getDashboardStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Total rooms
        const totalRooms = await Room.countDocuments({ isActive: true });

        // Occupied rooms
        const occupiedRooms = await Room.countDocuments({
            status: 'occupied',
            isActive: true
        });

        // Available rooms
        const availableRooms = await Room.countDocuments({
            status: 'available',
            isActive: true
        });

        // Check-ins today
        const checkInsToday = await Reservation.countDocuments({
            checkIn: { $gte: today, $lt: tomorrow },
            reservationStatus: { $in: ['confirmed', 'checked_in'] }
        });

        // Check-outs today
        const checkOutsToday = await Reservation.countDocuments({
            checkOut: { $gte: today, $lt: tomorrow },
            reservationStatus: { $in: ['checked_in', 'checked_out'] }
        });

        // Monthly revenue (current month)
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);

        const monthlyRevenueResult = await Reservation.aggregate([
            {
                $match: {
                    checkOut: { $gte: startOfMonth, $lte: endOfMonth },
                    reservationStatus: { $in: ['checked_out'] },
                    paymentStatus: { $in: ['paid', 'partial'] }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalAmount' }
                }
            }
        ]);

        const monthlyRevenue = monthlyRevenueResult.length > 0 ? monthlyRevenueResult[0].total : 0;

        // Occupancy rate
        const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

        // Upcoming check-ins (next 24 hours)
        const next24Hours = new Date();
        next24Hours.setHours(next24Hours.getHours() + 24);

        const upcomingCheckIns = await Reservation.find({
            checkIn: { $gte: today, $lte: next24Hours },
            reservationStatus: 'confirmed'
        })
            .select('guestName roomNumber checkIn')
            .sort({ checkIn: 1 })
            .limit(5)
            .lean();

        // Upcoming check-outs (next 24 hours)
        const upcomingCheckOuts = await Reservation.find({
            checkOut: { $gte: today, $lte: next24Hours },
            reservationStatus: 'checked_in'
        })
            .select('guestName roomNumber checkOut')
            .sort({ checkOut: 1 })
            .limit(5)
            .lean();

        // Get today's revenue
        const todayRevenueResult = await Reservation.aggregate([
            {
                $match: {
                    createdAt: { $gte: today, $lt: tomorrow },
                    paymentStatus: { $in: ['paid', 'partial'] }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalAmount' }
                }
            }
        ]);

        const todayRevenue = todayRevenueResult.length > 0 ? todayRevenueResult[0].total : 0;

        // Get pending payments
        const pendingPayments = await Reservation.countDocuments({
            paymentStatus: { $in: ['pending', 'partial'] },
            reservationStatus: { $in: ['confirmed', 'checked_in'] }
        });

        res.status(200).json({
            success: true,
            stats: {
                totalRooms,
                occupiedRooms,
                availableRooms,
                checkInsToday,
                checkOutsToday,
                monthlyRevenue,
                todayRevenue,
                pendingPayments,
                occupancyRate,
                upcomingCheckIns,
                upcomingCheckOuts
            }
        });

    } catch (error) {
        console.error('Get hotel dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get REAL-TIME reports data
// @route   GET /api/hotel/reports
// @access  Private/Admin, Hotel Staff
exports.getReports = async (req, res) => {
    try {
        const { startDate, endDate, groupBy = 'daily' } = req.query;

        // Set default dates if not provided
        const start = startDate ? new Date(startDate) : new Date();
        start.setDate(start.getDate() - 30); // Default to last 30 days
        start.setHours(0, 0, 0, 0);

        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);

        // Validate date range
        if (start > end) {
            return res.status(400).json({
                success: false,
                message: 'Start date must be before end date'
            });
        }

        // Group by format based on selection
        let dateFormat, groupStage;
        switch (groupBy) {
            case 'daily':
                dateFormat = '%Y-%m-%d';
                // Use checkIn date for daily grouping (when reservation was created/checked in)
                groupStage = {
                    $dateToString: {
                        format: dateFormat,
                        date: {
                            $cond: {
                                if: { $eq: ['$reservationStatus', 'checked_out'] },
                                then: '$checkOut',
                                else: '$checkIn'
                            }
                        }
                    }
                };
                break;
            case 'weekly':
                groupStage = {
                    $concat: [
                        {
                            $toString: {
                                $isoWeekYear: {
                                    $cond: {
                                        if: { $eq: ['$reservationStatus', 'checked_out'] },
                                        then: '$checkOut',
                                        else: '$checkIn'
                                    }
                                }
                            }
                        },
                        '-W',
                        {
                            $toString: {
                                $isoWeek: {
                                    $cond: {
                                        if: { $eq: ['$reservationStatus', 'checked_out'] },
                                        then: '$checkOut',
                                        else: '$checkIn'
                                    }
                                }
                            }
                        }
                    ]
                };
                break;
            case 'monthly':
                dateFormat = '%Y-%m';
                groupStage = {
                    $dateToString: {
                        format: dateFormat,
                        date: {
                            $cond: {
                                if: { $eq: ['$reservationStatus', 'checked_out'] },
                                then: '$checkOut',
                                else: '$checkIn'
                            }
                        }
                    }
                };
                break;
            default:
                dateFormat = '%Y-%m-%d';
                groupStage = {
                    $dateToString: {
                        format: dateFormat,
                        date: {
                            $cond: {
                                if: { $eq: ['$reservationStatus', 'checked_out'] },
                                then: '$checkOut',
                                else: '$checkIn'
                            }
                        }
                    }
                };
        }

        // 1. REVENUE DATA - Include ALL reservations with payment (not just checked_out)
        const revenueData = await Reservation.aggregate([
            {
                $match: {
                    $or: [
                        {
                            // For completed stays (checked_out)
                            checkOut: { $gte: start, $lte: end },
                            reservationStatus: 'checked_out',
                            paymentStatus: { $in: ['paid', 'partial'] }
                        },
                        {
                            // For active and upcoming reservations
                            checkIn: { $gte: start, $lte: end },
                            reservationStatus: { $in: ['confirmed', 'checked_in'] },
                            paymentStatus: { $in: ['paid', 'partial'] }
                        }
                    ]
                }
            },
            {
                $group: {
                    _id: groupStage,
                    revenue: { $sum: '$totalAmount' },
                    reservations: { $sum: 1 },
                    nights: { $sum: '$totalNights' },
                    // Calculate by status for better insights
                    confirmed: {
                        $sum: {
                            $cond: [{ $eq: ['$reservationStatus', 'confirmed'] }, 1, 0]
                        }
                    },
                    checkedIn: {
                        $sum: {
                            $cond: [{ $eq: ['$reservationStatus', 'checked_in'] }, 1, 0]
                        }
                    },
                    checkedOut: {
                        $sum: {
                            $cond: [{ $eq: ['$reservationStatus', 'checked_out'] }, 1, 0]
                        }
                    }
                }
            },
            {
                $addFields: {
                    avgRevenue: {
                        $cond: [
                            { $eq: ['$reservations', 0] },
                            0,
                            { $divide: ['$revenue', '$reservations'] }
                        ]
                    },
                    // Add date for sorting
                    date: {
                        $cond: [
                            { $regexMatch: { input: '$_id', regex: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/ } },
                            { $dateFromString: { dateString: '$_id' } },
                            '$_id'
                        ]
                    }
                }
            },
            { $sort: { date: 1 } }
        ]);

        // 2. ROOM TYPE DISTRIBUTION - All reservations
        const roomTypeData = await Reservation.aggregate([
            {
                $match: {
                    $or: [
                        {
                            checkOut: { $gte: start, $lte: end },
                            reservationStatus: 'checked_out',
                            paymentStatus: { $in: ['paid', 'partial'] }
                        },
                        {
                            checkIn: { $gte: start, $lte: end },
                            reservationStatus: { $in: ['confirmed', 'checked_in'] },
                            paymentStatus: { $in: ['paid', 'partial'] }
                        }
                    ]
                }
            },
            {
                $group: {
                    _id: '$roomType',
                    revenue: { $sum: '$totalAmount' },
                    reservations: { $sum: 1 },
                    nights: { $sum: '$totalNights' }
                }
            },
            { $sort: { revenue: -1 } }
        ]);

        // 3. PAYMENT STATUS DISTRIBUTION - All reservations in date range
        const paymentData = await Reservation.aggregate([
            {
                $match: {
                    $or: [
                        { checkIn: { $gte: start, $lte: end } },
                        { checkOut: { $gte: start, $lte: end } },
                        { createdAt: { $gte: start, $lte: end } }
                    ]
                }
            },
            {
                $group: {
                    _id: '$paymentStatus',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$totalAmount' },
                    // Breakdown by reservation status
                    confirmed: {
                        $sum: {
                            $cond: [{ $eq: ['$reservationStatus', 'confirmed'] }, 1, 0]
                        }
                    },
                    checkedIn: {
                        $sum: {
                            $cond: [{ $eq: ['$reservationStatus', 'checked_in'] }, 1, 0]
                        }
                    },
                    checkedOut: {
                        $sum: {
                            $cond: [{ $eq: ['$reservationStatus', 'checked_out'] }, 1, 0]
                        }
                    }
                }
            },
            {
                $addFields: {
                    status: '$_id',
                    percentage: {
                        $multiply: [
                            {
                                $divide: [
                                    '$count',
                                    { $sum: '$count' }
                                ]
                            },
                            100
                        ]
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 4. OCCUPANCY DATA - Daily occupancy based on check-ins
        const occupancyData = await Reservation.aggregate([
            {
                $match: {
                    checkIn: { $gte: start, $lte: end },
                    reservationStatus: { $in: ['confirmed', 'checked_in', 'checked_out'] }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$checkIn' } },
                    reservations: { $sum: 1 },
                    revenue: { $sum: '$totalAmount' },
                    roomsBooked: { $addToSet: '$roomNumber' }
                }
            },
            {
                $addFields: {
                    roomsBookedCount: { $size: '$roomsBooked' }
                }
            },
            { $sort: { _id: 1 } },
            { $limit: 30 }
        ]);

        // 5. RESERVATION STATUS DISTRIBUTION
        const statusData = await Reservation.aggregate([
            {
                $match: {
                    $or: [
                        { checkIn: { $gte: start, $lte: end } },
                        { checkOut: { $gte: start, $lte: end } },
                        { createdAt: { $gte: start, $lte: end } }
                    ]
                }
            },
            {
                $group: {
                    _id: '$reservationStatus',
                    count: { $sum: 1 },
                    totalRevenue: { $sum: '$totalAmount' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // 6. GET REAL-TIME PERFORMANCE METRICS
        // Total rooms count
        const totalRooms = await Room.countDocuments({ isActive: true });

        // Current occupancy
        const occupiedRooms = await Room.countDocuments({
            status: 'occupied',
            isActive: true
        });

        // Today's date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Today's check-ins
        const todayCheckIns = await Reservation.countDocuments({
            checkIn: { $gte: today, $lt: tomorrow },
            reservationStatus: { $in: ['confirmed', 'checked_in'] }
        });

        // Today's check-outs
        const todayCheckOuts = await Reservation.countDocuments({
            checkOut: { $gte: today, $lt: tomorrow },
            reservationStatus: { $in: ['checked_in', 'checked_out'] }
        });

        // Today's revenue (from all reservations with activity today)
        const todayRevenueResult = await Reservation.aggregate([
            {
                $match: {
                    $or: [
                        {
                            checkIn: { $gte: today, $lt: tomorrow },
                            paymentStatus: { $in: ['paid', 'partial'] }
                        },
                        {
                            checkOut: { $gte: today, $lt: tomorrow },
                            paymentStatus: { $in: ['paid', 'partial'] }
                        },
                        {
                            createdAt: { $gte: today, $lt: tomorrow },
                            paymentStatus: { $in: ['paid', 'partial'] }
                        }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    revenue: { $sum: '$totalAmount' },
                    reservations: { $sum: 1 }
                }
            }
        ]);

        const todayRevenue = todayRevenueResult[0]?.revenue || 0;

        // Current month performance
        const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        currentMonthEnd.setHours(23, 59, 59, 999);

        const currentMonthRevenue = await Reservation.aggregate([
            {
                $match: {
                    $or: [
                        {
                            checkOut: { $gte: currentMonthStart, $lte: currentMonthEnd },
                            reservationStatus: 'checked_out',
                            paymentStatus: { $in: ['paid', 'partial'] }
                        },
                        {
                            checkIn: { $gte: currentMonthStart, $lte: currentMonthEnd },
                            reservationStatus: { $in: ['confirmed', 'checked_in'] },
                            paymentStatus: { $in: ['paid', 'partial'] }
                        }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    revenue: { $sum: '$totalAmount' },
                    reservations: { $sum: 1 },
                    nights: { $sum: '$totalNights' }
                }
            }
        ]);

        // Calculate totals from revenueData (more accurate)
        const totalRevenue = revenueData.reduce((sum, item) => sum + (item.revenue || 0), 0);
        const totalReservations = revenueData.reduce((sum, item) => sum + (item.reservations || 0), 0);
        const totalNights = revenueData.reduce((sum, item) => sum + (item.nights || 0), 0);
        const avgRevenuePerReservation = totalReservations > 0 ? totalRevenue / totalReservations : 0;
        const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

        res.status(200).json({
            success: true,
            revenueData: revenueData || [],
            roomTypeData: roomTypeData || [],
            paymentData: paymentData || [],
            occupancyData: occupancyData || [],
            statusData: statusData || [],
            summary: {
                period: {
                    start: start.toISOString(),
                    end: end.toISOString(),
                    groupBy
                },
                totals: {
                    revenue: totalRevenue,
                    reservations: totalReservations,
                    nights: totalNights,
                    avgRevenuePerReservation: avgRevenuePerReservation,
                    occupancyRate: occupancyRate
                },
                currentPerformance: {
                    totalRooms,
                    occupiedRooms,
                    availableRooms: totalRooms - occupiedRooms,
                    todayCheckIns,
                    todayCheckOuts,
                    todayRevenue,
                    monthlyRevenue: currentMonthRevenue[0]?.revenue || 0,
                    monthlyReservations: currentMonthRevenue[0]?.reservations || 0,
                    monthlyNights: currentMonthRevenue[0]?.nights || 0
                }
            },
            metadata: {
                generatedAt: new Date().toISOString(),
                dataPoints: {
                    revenue: revenueData.length,
                    roomTypes: roomTypeData.length,
                    payments: paymentData.length,
                    occupancy: occupancyData.length
                }
            }
        });

    } catch (error) {
        console.error('Get hotel reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching reports',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// @desc    Initialize hotel defaults (room types, rooms, etc.)
// @route   POST /api/hotel/initialize-defaults
// @access  Private/Admin
exports.initializeDefaults = async (req, res) => {
    try {
        console.log('🔄 Initializing hotel defaults...');

        // Create default room types
        const defaultRoomTypes = [
            {
                name: 'Standard Room',
                description: 'Comfortable room with basic amenities',
                basePrice: 100,
                maxOccupancy: 2,
                amenities: ['TV', 'WiFi', 'AC', 'Mini Fridge'],
                isActive: true
            },
            {
                name: 'Deluxe Room',
                description: 'Spacious room with upgraded amenities',
                basePrice: 150,
                maxOccupancy: 3,
                amenities: ['TV', 'WiFi', 'AC', 'Mini Bar', 'Coffee Maker'],
                isActive: true
            },
            {
                name: 'Suite',
                description: 'Luxurious suite with separate living area',
                basePrice: 250,
                maxOccupancy: 4,
                amenities: ['TV', 'WiFi', 'AC', 'Mini Bar', 'Coffee Maker', 'Jacuzzi', 'Living Room'],
                isActive: true
            },
            {
                name: 'Executive Suite',
                description: 'Premium suite with executive amenities',
                basePrice: 350,
                maxOccupancy: 2,
                amenities: ['TV', 'WiFi', 'AC', 'Mini Bar', 'Coffee Maker', 'Jacuzzi', 'Work Desk', 'Meeting Area'],
                isActive: true
            }
        ];

        // Check if room types already exist
        const existingRoomTypes = await RoomType.countDocuments();
        let createdRoomTypes = [];

        if (existingRoomTypes === 0) {
            createdRoomTypes = await RoomType.insertMany(defaultRoomTypes);
            console.log(`✅ Created ${createdRoomTypes.length} room types`);
        } else {
            console.log(`⚠️ Room types already exist (${existingRoomTypes} found)`);
            createdRoomTypes = await RoomType.find();
        }

        // Create default rooms
        const defaultRooms = [];
        const roomTypes = createdRoomTypes;

        // Create 20 rooms total
        for (let i = 1; i <= 20; i++) {
            const floor = Math.floor((i - 1) / 5) + 1; // 5 rooms per floor
            const roomTypeIndex = Math.floor((i - 1) / 5) % roomTypes.length; // Distribute room types
            const roomType = roomTypes[roomTypeIndex];

            defaultRooms.push({
                roomNumber: `${floor}${String(i % 5 || 5).padStart(2, '0')}`, // e.g., 101, 102, ... 205, 301, etc.
                roomType: roomType.name,
                floor: floor,
                price: roomType.basePrice,
                status: 'available',
                isActive: true,
                features: roomType.amenities,
                lastCleaned: new Date(),
                nextCleaning: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
            });
        }

        // Check if rooms already exist
        const existingRooms = await Room.countDocuments();
        let createdRooms = [];

        if (existingRooms === 0) {
            createdRooms = await Room.insertMany(defaultRooms);
            console.log(`✅ Created ${createdRooms.length} rooms`);
        } else {
            console.log(`⚠️ Rooms already exist (${existingRooms} found)`);
            createdRooms = await Room.find();
        }

        // Check if any reservations exist
        const existingReservations = await Reservation.countDocuments();

        res.status(200).json({
            success: true,
            message: 'Hotel defaults initialized successfully',
            data: {
                roomTypes: createdRoomTypes.length,
                rooms: createdRooms.length,
                reservations: existingReservations,
                details: {
                    roomTypes: existingRoomTypes === 0 ? 'Created new' : 'Already existed',
                    rooms: existingRooms === 0 ? 'Created new' : 'Already existed'
                }
            }
        });

    } catch (error) {
        console.error('Initialize hotel defaults error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initialize hotel defaults',
            error: error.message
        });
    }
};