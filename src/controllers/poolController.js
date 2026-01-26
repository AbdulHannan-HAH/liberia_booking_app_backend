const Pool = require('../models/Pool');
const TicketPrice = require('../models/TicketPrice');
const TimeSlot = require('../models/TimeSlot');

// @desc    Get all pool bookings with filters
// @route   GET /api/pool/bookings
// @access  Private/Admin, Pool Staff
exports.getBookings = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            search,
            date,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const query = {};

        // Filter by status
        if (status && status !== 'all') {
            query.paymentStatus = status;
        }

        // Filter by date
        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
            query.date = { $gte: startDate, $lte: endDate };
        }

        // Search functionality
        if (search) {
            query.$or = [
                { customerName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { bookingNumber: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get bookings with population
        const bookings = await Pool.find(query)
            .sort(sort)
            .limit(parseInt(limit))
            .skip(skip)
            .populate('createdBy', 'name email')
            .lean();

        const total = await Pool.countDocuments(query);

        res.status(200).json({
            success: true,
            count: bookings.length,
            total,
            totalPages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page),
            bookings
        });

    } catch (error) {
        console.error('Get bookings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get single booking
// @route   GET /api/pool/bookings/:id
// @access  Private/Admin, Pool Staff
exports.getBooking = async (req, res) => {
    try {
        const booking = await Pool.findById(req.params.id)
            .populate('createdBy', 'name email')
            .lean();

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        res.status(200).json({
            success: true,
            booking
        });

    } catch (error) {
        console.error('Get booking error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Create new booking with real validation
// @route   POST /api/pool/bookings
// @access  Private/Admin, Pool Staff
exports.createBooking = async (req, res) => {
    try {
        console.log('🎫 Creating new pool booking...');
        console.log('Request body:', req.body);

        const {
            customerName,
            email,
            phone,
            date,
            timeSlot,
            passType,
            persons,
            paymentStatus,
            notes
        } = req.body;

        // Validate required fields
        if (!customerName || !email || !phone || !date || !timeSlot || !passType || !persons) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Check time slot availability
        const slot = await TimeSlot.findOne({ value: timeSlot });
        if (!slot || !slot.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Selected time slot is not available'
            });
        }

        // Check capacity for the selected date and time slot
        const selectedDate = new Date(date);
        selectedDate.setHours(0, 0, 0, 0);
        const endDate = new Date(selectedDate);
        endDate.setHours(23, 59, 59, 999);

        const existingBookings = await Pool.find({
            date: { $gte: selectedDate, $lte: endDate },
            timeSlot: timeSlot,
            paymentStatus: { $ne: 'cancelled' }
        });

        const totalBookedPersons = existingBookings.reduce((sum, booking) => sum + booking.persons, 0);
        const availableSpots = slot.maxCapacity - totalBookedPersons;

        if (availableSpots < parseInt(persons)) {
            return res.status(400).json({
                success: false,
                message: `Only ${availableSpots} spots available in this slot`
            });
        }

        // Get ticket price
        const ticket = await TicketPrice.findOne({ passType, isActive: true });
        if (!ticket) {
            return res.status(400).json({
                success: false,
                message: 'Selected pass type is not available'
            });
        }

        // Validate max persons for pass type
        if (parseInt(persons) > ticket.maxPersons) {
            return res.status(400).json({
                success: false,
                message: `Maximum ${ticket.maxPersons} persons allowed for ${passType} pass`
            });
        }

        // Calculate amount
        let amount;
        if (passType === 'family') {
            amount = ticket.price;
        } else {
            amount = ticket.price * parseInt(persons);
        }

        // Generate booking number
        const bookingCount = await Pool.countDocuments();
        const bookingNumber = `PB-${Date.now().toString().slice(-6)}-${bookingCount + 1}`;

        // Create booking
        const booking = await Pool.create({
            customerName,
            email,
            phone,
            date: selectedDate,
            timeSlot,
            passType,
            persons: parseInt(persons),
            amount,
            paymentStatus: paymentStatus || 'pending',
            notes: notes || '',
            bookingNumber,
            createdBy: req.user._id
        });

        // Update time slot current bookings count
        slot.currentBookings = totalBookedPersons + parseInt(persons);
        await slot.save();

        console.log('✅ Booking created:', booking.bookingNumber);

        // Populate createdBy info
        const populatedBooking = await Pool.findById(booking._id)
            .populate('createdBy', 'name email')
            .lean();

        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            booking: populatedBooking
        });

    } catch (error) {
        console.error('Create booking error:', error);
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

// @desc    Update booking
// @route   PUT /api/pool/bookings/:id
// @access  Private/Admin, Pool Staff
exports.updateBooking = async (req, res) => {
    try {
        const {
            customerName,
            email,
            phone,
            date,
            timeSlot,
            passType,
            persons,
            paymentStatus,
            notes
        } = req.body;

        // Find booking
        const booking = await Pool.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Store old values for capacity calculation
        const oldTimeSlot = booking.timeSlot;
        const oldPersons = booking.persons;
        const oldDate = booking.date;

        // Update fields
        if (customerName) booking.customerName = customerName;
        if (email) booking.email = email;
        if (phone) booking.phone = phone;
        if (date) booking.date = new Date(date);
        if (timeSlot) booking.timeSlot = timeSlot;
        if (passType) booking.passType = passType;
        if (persons) booking.persons = parseInt(persons);
        if (paymentStatus) booking.paymentStatus = paymentStatus;
        if (notes !== undefined) booking.notes = notes;

        // Handle time slot capacity if changed
        if (timeSlot !== oldTimeSlot || date !== oldDate || persons !== oldPersons) {
            // Free up old slot capacity
            if (oldTimeSlot && oldDate) {
                const oldSlot = await TimeSlot.findOne({ value: oldTimeSlot });
                if (oldSlot) {
                    oldSlot.currentBookings = Math.max(0, oldSlot.currentBookings - oldPersons);
                    await oldSlot.save();
                }
            }

            // Check new slot capacity
            const newSlot = await TimeSlot.findOne({ value: booking.timeSlot });
            if (!newSlot || !newSlot.isActive) {
                return res.status(400).json({
                    success: false,
                    message: 'Selected time slot is not available'
                });
            }

            // Calculate capacity for new slot
            const selectedDate = new Date(booking.date);
            selectedDate.setHours(0, 0, 0, 0);
            const endDate = new Date(selectedDate);
            endDate.setHours(23, 59, 59, 999);

            const existingBookings = await Pool.find({
                _id: { $ne: booking._id },
                date: { $gte: selectedDate, $lte: endDate },
                timeSlot: booking.timeSlot,
                paymentStatus: { $ne: 'cancelled' }
            });

            const totalBookedPersons = existingBookings.reduce((sum, b) => sum + b.persons, 0);
            const availableSpots = newSlot.maxCapacity - totalBookedPersons;

            if (availableSpots < booking.persons) {
                return res.status(400).json({
                    success: false,
                    message: `Only ${availableSpots} spots available in this slot`
                });
            }

            // Update new slot capacity
            newSlot.currentBookings = totalBookedPersons + booking.persons;
            await newSlot.save();
        }

        // Recalculate amount if passType or persons changed
        if (passType || persons) {
            const ticket = await TicketPrice.findOne({
                passType: booking.passType,
                isActive: true
            });
            if (ticket) {
                if (booking.passType === 'family') {
                    booking.amount = ticket.price;
                } else {
                    booking.amount = ticket.price * booking.persons;
                }
            }
        }

        await booking.save();

        // Get updated booking with populated data
        const updatedBooking = await Pool.findById(booking._id)
            .populate('createdBy', 'name email')
            .lean();

        res.status(200).json({
            success: true,
            message: 'Booking updated successfully',
            booking: updatedBooking
        });

    } catch (error) {
        console.error('Update booking error:', error);
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
                message: 'Booking not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Delete booking
// @route   DELETE /api/pool/bookings/:id
// @access  Private/Admin
exports.deleteBooking = async (req, res) => {
    try {
        const booking = await Pool.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Free up slot capacity before deleting
        const slot = await TimeSlot.findOne({ value: booking.timeSlot });
        if (slot) {
            slot.currentBookings = Math.max(0, slot.currentBookings - booking.persons);
            await slot.save();
        }

        await booking.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Booking deleted successfully'
        });

    } catch (error) {
        console.error('Delete booking error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update payment status
// @route   PUT /api/pool/bookings/:id/status
// @access  Private/Admin, Pool Staff
exports.updatePaymentStatus = async (req, res) => {
    try {
        const { paymentStatus } = req.body;

        if (!paymentStatus || !['paid', 'pending', 'cancelled'].includes(paymentStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment status'
            });
        }

        const booking = await Pool.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // If changing to cancelled, free up slot capacity
        if (paymentStatus === 'cancelled' && booking.paymentStatus !== 'cancelled') {
            const slot = await TimeSlot.findOne({ value: booking.timeSlot });
            if (slot) {
                slot.currentBookings = Math.max(0, slot.currentBookings - booking.persons);
                await slot.save();
            }
        }
        // If changing from cancelled to another status, add back capacity
        else if (booking.paymentStatus === 'cancelled' && paymentStatus !== 'cancelled') {
            const slot = await TimeSlot.findOne({ value: booking.timeSlot });
            if (slot) {
                // Check if there's still capacity
                const selectedDate = new Date(booking.date);
                selectedDate.setHours(0, 0, 0, 0);
                const endDate = new Date(selectedDate);
                endDate.setHours(23, 59, 59, 999);

                const existingBookings = await Pool.find({
                    _id: { $ne: booking._id },
                    date: { $gte: selectedDate, $lte: endDate },
                    timeSlot: booking.timeSlot,
                    paymentStatus: { $ne: 'cancelled' }
                });

                const totalBookedPersons = existingBookings.reduce((sum, b) => sum + b.persons, 0);
                const availableSpots = slot.maxCapacity - totalBookedPersons;

                if (availableSpots < booking.persons) {
                    return res.status(400).json({
                        success: false,
                        message: `Slot is now full. Only ${availableSpots} spots available`
                    });
                }

                slot.currentBookings = totalBookedPersons + booking.persons;
                await slot.save();
            }
        }

        booking.paymentStatus = paymentStatus;
        await booking.save();

        const updatedBooking = await Pool.findById(booking._id)
            .populate('createdBy', 'name email')
            .lean();

        res.status(200).json({
            success: true,
            message: 'Payment status updated successfully',
            booking: updatedBooking
        });

    } catch (error) {
        console.error('Update payment status error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get dashboard stats
// @route   GET /api/pool/dashboard
// @access  Private/Admin, Pool Staff
exports.getDashboardStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Today's bookings count
        const todayBookings = await Pool.countDocuments({
            date: { $gte: today, $lt: tomorrow },
            paymentStatus: { $ne: 'cancelled' }
        });

        // Total revenue today
        const todayRevenueResult = await Pool.aggregate([
            {
                $match: {
                    date: { $gte: today, $lt: tomorrow },
                    paymentStatus: 'paid'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);

        const todayRevenue = todayRevenueResult.length > 0 ? todayRevenueResult[0].total : 0;

        // Pending payments count
        const pendingPayments = await Pool.countDocuments({
            paymentStatus: 'pending',
            date: { $gte: today }
        });

        // Get current time slot capacity
        const now = new Date();
        const currentHour = now.getHours();
        let currentTimeSlot = null;

        // Determine current time slot
        if (currentHour >= 6 && currentHour < 9) currentTimeSlot = '06:00-09:00';
        else if (currentHour >= 9 && currentHour < 12) currentTimeSlot = '09:00-12:00';
        else if (currentHour >= 12 && currentHour < 15) currentTimeSlot = '12:00-15:00';
        else if (currentHour >= 15 && currentHour < 18) currentTimeSlot = '15:00-18:00';
        else if (currentHour >= 18 && currentHour < 21) currentTimeSlot = '18:00-21:00';

        let currentCapacity = 0;
        let maxCapacity = 0;

        if (currentTimeSlot) {
            const slot = await TimeSlot.findOne({ value: currentTimeSlot });
            if (slot) {
                maxCapacity = slot.maxCapacity;
                // Get current bookings for this time slot today
                const currentBookings = await Pool.find({
                    date: { $gte: today, $lt: tomorrow },
                    timeSlot: currentTimeSlot,
                    paymentStatus: { $ne: 'cancelled' }
                });
                currentCapacity = currentBookings.reduce((sum, booking) => sum + booking.persons, 0);
            }
        }

        // Get recent bookings (last 5)
        const recentBookings = await Pool.find({
            paymentStatus: { $ne: 'cancelled' }
        })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('createdBy', 'name')
            .lean();

        // Get time slot distribution for today
        const timeSlotDistribution = await Pool.aggregate([
            {
                $match: {
                    date: { $gte: today, $lt: tomorrow },
                    paymentStatus: { $ne: 'cancelled' }
                }
            },
            {
                $group: {
                    _id: '$timeSlot',
                    bookings: { $sum: 1 },
                    persons: { $sum: '$persons' },
                    revenue: { $sum: '$amount' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.status(200).json({
            success: true,
            stats: {
                todayBookings,
                todayRevenue,
                pendingPayments,
                currentCapacity,
                maxCapacity,
                capacityPercentage: maxCapacity > 0 ? (currentCapacity / maxCapacity) * 100 : 0,
                recentBookings,
                timeSlotDistribution
            }
        });

    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get reports data
// @route   GET /api/pool/reports
// @access  Private/Admin, Pool Staff
exports.getReports = async (req, res) => {
    try {
        const { startDate, endDate, groupBy = 'day' } = req.query;

        const start = startDate ? new Date(startDate) : new Date();
        start.setDate(start.getDate() - 30); // Default to last 30 days
        start.setHours(0, 0, 0, 0);

        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);

        let groupFormat, sortFormat;
        switch (groupBy) {
            case 'day':
                groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
                sortFormat = { _id: 1 };
                break;
            case 'month':
                groupFormat = { $dateToString: { format: '%Y-%m', date: '$date' } };
                sortFormat = { _id: 1 };
                break;
            case 'week':
                groupFormat = { $week: '$date' };
                sortFormat = { _id: 1 };
                break;
            default:
                groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
                sortFormat = { _id: 1 };
        }

        // Revenue data by time period
        const revenueData = await Pool.aggregate([
            {
                $match: {
                    date: { $gte: start, $lte: end },
                    paymentStatus: 'paid'
                }
            },
            {
                $group: {
                    _id: groupFormat,
                    revenue: { $sum: '$amount' },
                    bookings: { $sum: 1 },
                    visitors: { $sum: '$persons' }
                }
            },
            { $sort: sortFormat }
        ]);

        // Pass type distribution
        const passTypeData = await Pool.aggregate([
            {
                $match: {
                    date: { $gte: start, $lte: end },
                    paymentStatus: { $ne: 'cancelled' }
                }
            },
            {
                $group: {
                    _id: '$passType',
                    count: { $sum: 1 },
                    revenue: { $sum: '$amount' },
                    visitors: { $sum: '$persons' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Time slot analysis
        const timeSlotData = await Pool.aggregate([
            {
                $match: {
                    date: { $gte: start, $lte: end },
                    paymentStatus: { $ne: 'cancelled' }
                }
            },
            {
                $group: {
                    _id: '$timeSlot',
                    visitors: { $sum: '$persons' },
                    revenue: { $sum: '$amount' },
                    bookings: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Daily trend for the last 7 days
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);
        last7Days.setHours(0, 0, 0, 0);

        const dailyTrend = await Pool.aggregate([
            {
                $match: {
                    date: { $gte: last7Days, $lte: end },
                    paymentStatus: 'paid'
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                    revenue: { $sum: '$amount' },
                    bookings: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            { $limit: 7 }
        ]);

        // Top customers
        const topCustomers = await Pool.aggregate([
            {
                $match: {
                    date: { $gte: start, $lte: end },
                    paymentStatus: 'paid'
                }
            },
            {
                $group: {
                    _id: '$customerName',
                    bookings: { $sum: 1 },
                    totalSpent: { $sum: '$amount' },
                    lastVisit: { $max: '$date' }
                }
            },
            { $sort: { totalSpent: -1 } },
            { $limit: 10 }
        ]);

        res.status(200).json({
            success: true,
            revenueData,
            passTypeData,
            timeSlotData,
            dailyTrend,
            topCustomers,
            period: {
                start: start.toISOString(),
                end: end.toISOString(),
                groupBy
            }
        });

    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};