const Conference = require('../models/Conference');
const ConferenceHall = require('../models/ConferenceHall');

// @desc    Get all conference bookings with filters
// @route   GET /api/conference/bookings
// @access  Private/Admin, Conference Staff
exports.getBookings = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            bookingStatus,
            search,
            startDate,
            endDate,
            sortBy = 'startDate',
            sortOrder = 'asc'
        } = req.query;

        const query = {};

        // Filter by payment status
        if (status && status !== 'all') {
            query.paymentStatus = status;
        }

        // Filter by booking status
        if (bookingStatus && bookingStatus !== 'all') {
            query.bookingStatus = bookingStatus;
        }

        // Filter by date range
        if (startDate && endDate) {
            query.startDate = { $gte: new Date(startDate) };
            query.endDate = { $lte: new Date(endDate) };
        } else if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            query.startDate = { $gte: start };
        }

        // Search functionality
        if (search) {
            query.$or = [
                { clientName: { $regex: search, $options: 'i' } },
                { eventName: { $regex: search, $options: 'i' } },
                { company: { $regex: search, $options: 'i' } },
                { bookingNumber: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get bookings with population
        const bookings = await Conference.find(query)
            .sort(sort)
            .limit(parseInt(limit))
            .skip(skip)
            .populate('createdBy', 'name email')
            .populate('approvedBy', 'name')
            .lean();

        const total = await Conference.countDocuments(query);

        res.status(200).json({
            success: true,
            count: bookings.length,
            total,
            totalPages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page),
            bookings
        });

    } catch (error) {
        console.error('Get conference bookings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get single conference booking
// @route   GET /api/conference/bookings/:id
// @access  Private/Admin, Conference Staff
exports.getBooking = async (req, res) => {
    try {
        const booking = await Conference.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('approvedBy', 'name')
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
        console.error('Get conference booking error:', error);
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

// @desc    Create new conference booking
// @route   POST /api/conference/bookings
// @access  Private/Admin, Conference Staff
exports.createBooking = async (req, res) => {
    try {
        console.log('🎫 ========== CREATE BOOKING START ==========');
        console.log('📥 Request received at:', new Date().toISOString());
        console.log('👤 User ID:', req.user?._id);
        console.log('📦 Request body:', JSON.stringify(req.body, null, 2));

        const {
            eventName,
            clientName,
            company,
            email,
            phone,
            hallType,
            startDate,
            endDate,
            startTime,
            endTime,
            eventType,
            attendees,
            cateringRequired,
            equipmentRequired,
            specialRequirements,
            amount,
            advancePaid,
            notes
        } = req.body;

        // 📋 Step 1: Validate required fields
        console.log('📋 STEP 1: Validating required fields...');
        const requiredFields = ['eventName', 'clientName', 'email', 'phone', 'hallType',
            'startDate', 'endDate', 'startTime', 'endTime', 'eventType',
            'attendees', 'amount'];

        let missingFields = [];
        for (const field of requiredFields) {
            if (!req.body[field] && req.body[field] !== 0) {
                missingFields.push(field);
            }
        }

        if (missingFields.length > 0) {
            console.log('❌ Missing required fields:', missingFields);
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }
        console.log('✅ All required fields present');

        // 📅 Step 2: Parse and validate dates
        console.log('📅 STEP 2: Parsing dates...');
        console.log('startDate string:', startDate);
        console.log('endDate string:', endDate);

        const startDateTime = new Date(startDate);
        const endDateTime = new Date(endDate);

        console.log('Parsed startDateTime:', startDateTime.toISOString());
        console.log('Parsed endDateTime:', endDateTime.toISOString());
        console.log('Is startDateTime valid?', !isNaN(startDateTime.getTime()));
        console.log('Is endDateTime valid?', !isNaN(endDateTime.getTime()));

        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
            console.log('❌ Invalid date format');
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Please use YYYY-MM-DD format'
            });
        }

        // Ensure end date is not before start date
        if (endDateTime < startDateTime) {
            console.log('❌ End date is before start date');
            return res.status(400).json({
                success: false,
                message: 'End date cannot be before start date'
            });
        }

        // 🏛️ Step 3: Check hall availability
        console.log('🏛️ STEP 3: Checking hall availability...');
        console.log('Looking for hall with value:', hallType);

        const hall = await ConferenceHall.findOne({ value: hallType, isActive: true });
        if (!hall) {
            console.log('❌ Hall not found or inactive');
            return res.status(400).json({
                success: false,
                message: 'Selected hall is not available'
            });
        }
        console.log('✅ Hall found:', hall.name);
        console.log('Hall capacity:', hall.capacity);
        console.log('Hall daily rate:', hall.dailyRate);

        // 👥 Step 4: Check capacity
        console.log('👥 STEP 4: Checking capacity...');
        const attendeesNum = parseInt(attendees);
        console.log('Requested attendees:', attendeesNum);

        if (isNaN(attendeesNum) || attendeesNum < 1) {
            console.log('❌ Invalid attendees number');
            return res.status(400).json({
                success: false,
                message: 'Number of attendees must be at least 1'
            });
        }

        if (attendeesNum > hall.capacity) {
            console.log(`❌ Capacity exceeded: ${attendeesNum} > ${hall.capacity}`);
            return res.status(400).json({
                success: false,
                message: `Hall capacity is ${hall.capacity}, cannot book for ${attendeesNum} attendees`
            });
        }
        console.log('✅ Capacity check passed');

        // 📅 Step 5: Check for overlapping bookings
        console.log('📅 STEP 5: Checking for overlapping bookings...');
        const overlappingBookings = await Conference.find({
            hallType,
            $or: [
                {
                    startDate: { $lte: endDateTime },
                    endDate: { $gte: startDateTime }
                }
            ],
            bookingStatus: { $in: ['approved', 'confirmed', 'pending'] }
        });

        console.log('Found overlapping bookings:', overlappingBookings.length);
        if (overlappingBookings.length > 0) {
            console.log('❌ Hall already booked for selected dates');
            return res.status(400).json({
                success: false,
                message: 'Hall is already booked for selected dates'
            });
        }
        console.log('✅ No overlapping bookings found');

        // 🔢 Step 6: Generate booking number (MOVED FROM PRE-SAVE HOOK)
        console.log('🔢 STEP 6: Generating booking number...');
        const bookingCount = await Conference.countDocuments();
        const bookingNumber = `CH-${Date.now().toString().slice(-6)}-${bookingCount + 1}`;
        console.log('Generated booking number:', bookingNumber);

        // 💰 Step 7: Parse and validate payment details
        console.log('💰 STEP 7: Processing payment details...');
        const amountNum = parseFloat(amount);
        const advancePaidNum = parseFloat(advancePaid) || 0;

        console.log('Amount:', amountNum);
        console.log('Advance Paid:', advancePaidNum);

        if (isNaN(amountNum) || amountNum <= 0) {
            console.log('❌ Invalid amount');
            return res.status(400).json({
                success: false,
                message: 'Amount must be a positive number'
            });
        }

        let paymentStatus = 'pending';
        if (advancePaidNum >= amountNum) {
            paymentStatus = 'paid';
        } else if (advancePaidNum > 0) {
            paymentStatus = 'partial';
        }
        console.log('Payment Status:', paymentStatus);

        // 🔧 Step 7b: Generate invoice number if needed (MOVED FROM PRE-SAVE HOOK)
        console.log('🔧 STEP 7b: Checking for invoice generation...');
        let invoiceNumber = '';
        if (req.body.bookingStatus === 'approved') {
            const invoiceCount = Math.floor(Math.random() * 1000) + 1000;
            invoiceNumber = `INV-CH-${new Date().getFullYear()}-${invoiceCount}`;
            console.log('Generated invoice number:', invoiceNumber);
        }

        // 📝 Step 8: Create booking document
        console.log('📝 STEP 8: Creating booking in database...');

        const bookingData = {
            eventName,
            clientName,
            company: company || '',
            email,
            phone,
            hallType,
            startDate: startDateTime,
            endDate: endDateTime,
            startTime,
            endTime,
            eventType,
            attendees: attendeesNum,
            cateringRequired: cateringRequired || false,
            equipmentRequired: equipmentRequired || false,
            specialRequirements: specialRequirements || '',
            amount: amountNum,
            advancePaid: advancePaidNum,
            paymentStatus,
            bookingStatus: 'pending', // Default to pending
            bookingNumber,
            notes: notes || '',
            createdBy: req.user._id
        };

        // Add invoice number if generated
        if (invoiceNumber) {
            bookingData.invoiceNumber = invoiceNumber;
            bookingData.approvedAt = new Date();
            bookingData.approvedBy = req.user._id;
        }

        console.log('Booking data to save:', JSON.stringify(bookingData, null, 2));

        // 🔍 Step 9: Create the booking
        console.log('🔍 STEP 9: Saving to database...');
        const booking = await Conference.create(bookingData);

        console.log('✅ Conference booking created successfully!');
        console.log('Booking ID:', booking._id);
        console.log('Booking Number:', booking.bookingNumber);
        console.log('Created at:', booking.createdAt);

        // 👤 Step 10: Populate and return response
        console.log('👤 STEP 10: Populating booking details...');
        const populatedBooking = await Conference.findById(booking._id)
            .populate('createdBy', 'name email')
            .populate('approvedBy', 'name')
            .lean();

        console.log('🎉 ========== CREATE BOOKING SUCCESS ==========');

        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            booking: populatedBooking
        });

    } catch (error) {
        console.error('❌ ========== CREATE BOOKING ERROR ==========');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);

        // Log the full error for debugging
        if (error.errors) {
            console.error('Validation errors:');
            Object.keys(error.errors).forEach(key => {
                console.error(`  ${key}:`, error.errors[key].message);
            });
        }

        console.error('Error stack:', error.stack);

        // Handle specific error types
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }

        if (error.name === 'MongoServerError' && error.code === 11000) {
            console.error('Duplicate key error:', error.keyValue);
            return res.status(400).json({
                success: false,
                message: 'Duplicate booking detected. Please try again.'
            });
        }

        // For development, return detailed error
        if (process.env.NODE_ENV === 'development') {
            return res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message,
                stack: error.stack
            });
        }

        // For production, return generic error
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.'
        });
    }
};

// @desc    Update conference booking
// @route   PUT /api/conference/bookings/:id
// @access  Private/Admin, Conference Staff
exports.updateBooking = async (req, res) => {
    try {
        const booking = await Conference.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Update fields
        const updatableFields = [
            'eventName', 'clientName', 'company', 'email', 'phone',
            'hallType', 'startDate', 'endDate', 'startTime', 'endTime',
            'eventType', 'attendees', 'cateringRequired', 'equipmentRequired',
            'specialRequirements', 'amount', 'advancePaid', 'notes'
        ];

        updatableFields.forEach(field => {
            if (req.body[field] !== undefined) {
                if (field === 'startDate' || field === 'endDate') {
                    booking[field] = new Date(req.body[field]);
                } else if (field === 'attendees' || field === 'amount' || field === 'advancePaid') {
                    booking[field] = parseFloat(req.body[field]);
                } else if (field === 'cateringRequired' || field === 'equipmentRequired') {
                    booking[field] = Boolean(req.body[field]);
                } else {
                    booking[field] = req.body[field];
                }
            }
        });

        // Update payment status based on advance paid
        if (req.body.advancePaid !== undefined) {
            if (booking.advancePaid >= booking.amount) {
                booking.paymentStatus = 'paid';
            } else if (booking.advancePaid > 0) {
                booking.paymentStatus = 'partial';
            } else {
                booking.paymentStatus = 'pending';
            }
        }

        // Generate invoice number if booking is being approved
        if (req.body.bookingStatus === 'approved' && booking.bookingStatus !== 'approved') {
            if (!booking.invoiceNumber) {
                const invoiceCount = Math.floor(Math.random() * 1000) + 1000;
                booking.invoiceNumber = `INV-CH-${new Date().getFullYear()}-${invoiceCount}`;
                booking.approvedAt = new Date();
                booking.approvedBy = req.user._id;
            }
        }

        await booking.save();

        const updatedBooking = await Conference.findById(booking._id)
            .populate('createdBy', 'name email')
            .populate('approvedBy', 'name')
            .lean();

        res.status(200).json({
            success: true,
            message: 'Booking updated successfully',
            booking: updatedBooking
        });

    } catch (error) {
        console.error('Update conference booking error:', error);
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

// @desc    Update booking status (approve/reject/confirm)
// @route   PUT /api/conference/bookings/:id/status
// @access  Private/Admin, Conference Staff
exports.updateBookingStatus = async (req, res) => {
    try {
        const { bookingStatus } = req.body;

        if (!bookingStatus || !['pending', 'approved', 'confirmed', 'completed', 'cancelled'].includes(bookingStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid booking status'
            });
        }

        const booking = await Conference.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // If approving, check hall availability
        if (bookingStatus === 'approved' && booking.bookingStatus !== 'approved') {
            const overlappingBookings = await Conference.find({
                hallType: booking.hallType,
                _id: { $ne: booking._id },
                startDate: { $lte: booking.endDate },
                endDate: { $gte: booking.startDate },
                bookingStatus: { $in: ['approved', 'confirmed'] }
            });

            if (overlappingBookings.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Hall is already booked for these dates'
                });
            }
        }

        booking.bookingStatus = bookingStatus;

        // If approved, set approvedBy and generate invoice
        if (bookingStatus === 'approved') {
            booking.approvedBy = req.user._id;
            booking.approvedAt = new Date();

            // Generate invoice number if not already exists
            if (!booking.invoiceNumber) {
                const invoiceCount = Math.floor(Math.random() * 1000) + 1000;
                booking.invoiceNumber = `INV-CH-${new Date().getFullYear()}-${invoiceCount}`;
            }
        }

        await booking.save();

        const updatedBooking = await Conference.findById(booking._id)
            .populate('createdBy', 'name email')
            .populate('approvedBy', 'name')
            .lean();

        res.status(200).json({
            success: true,
            message: 'Booking status updated successfully',
            booking: updatedBooking
        });

    } catch (error) {
        console.error('Update booking status error:', error);
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
// @route   PUT /api/conference/bookings/:id/payment
// @access  Private/Admin, Conference Staff
exports.updatePaymentStatus = async (req, res) => {
    try {
        const { paymentStatus, advancePaid } = req.body;

        if (!paymentStatus || !['pending', 'partial', 'paid', 'cancelled', 'refunded'].includes(paymentStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment status'
            });
        }

        const booking = await Conference.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        booking.paymentStatus = paymentStatus;
        if (advancePaid !== undefined) {
            booking.advancePaid = parseFloat(advancePaid);
        }

        await booking.save();

        const updatedBooking = await Conference.findById(booking._id)
            .populate('createdBy', 'name email')
            .populate('approvedBy', 'name')
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

// @desc    Delete conference booking
// @route   DELETE /api/conference/bookings/:id
// @access  Private/Admin
exports.deleteBooking = async (req, res) => {
    try {
        const booking = await Conference.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Check if booking can be deleted
        if (booking.bookingStatus === 'confirmed' || booking.bookingStatus === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete confirmed or completed bookings'
            });
        }

        await booking.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Booking deleted successfully'
        });

    } catch (error) {
        console.error('Delete conference booking error:', error);
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

// @desc    Get dashboard stats for conference
// @route   GET /api/conference/dashboard
// @access  Private/Admin, Conference Staff
exports.getDashboardStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Today's events
        const todayEvents = await Conference.countDocuments({
            startDate: { $gte: today, $lt: tomorrow },
            bookingStatus: { $in: ['approved', 'confirmed'] }
        });

        // Pending approvals
        const pendingApprovals = await Conference.countDocuments({
            bookingStatus: 'pending'
        });

        // Monthly revenue
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);

        const monthlyRevenueResult = await Conference.aggregate([
            {
                $match: {
                    startDate: { $gte: startOfMonth, $lte: endOfMonth },
                    paymentStatus: { $in: ['partial', 'paid'] }
                }
            },
            {
                $group: {
                    _id: null,
                    revenue: { $sum: '$advancePaid' },
                    totalAmount: { $sum: '$amount' }
                }
            }
        ]);

        const monthlyRevenue = monthlyRevenueResult.length > 0 ? monthlyRevenueResult[0].revenue : 0;
        const monthlyTotalAmount = monthlyRevenueResult.length > 0 ? monthlyRevenueResult[0].totalAmount : 0;

        // Hall utilization
        const halls = await ConferenceHall.find({ isActive: true });
        const hallUtilization = [];

        for (const hall of halls) {
            const bookings = await Conference.countDocuments({
                hallType: hall.value,
                startDate: { $gte: startOfMonth, $lte: endOfMonth },
                bookingStatus: { $in: ['approved', 'confirmed'] }
            });

            const utilization = hall.maxDailyBookings > 0
                ? (bookings / (hall.maxDailyBookings * 30)) * 100
                : 0;

            hallUtilization.push({
                _id: hall._id,
                name: hall.name,
                capacity: hall.capacity,
                bookingCount: bookings,
                utilization: Math.min(utilization, 100)
            });
        }

        // Upcoming events (next 7 days)
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        const upcomingEvents = await Conference.find({
            startDate: { $gte: today, $lte: nextWeek },
            bookingStatus: { $in: ['approved', 'confirmed'] }
        })
            .sort({ startDate: 1 })
            .limit(5)
            .populate('createdBy', 'name')
            .lean();

        // Event type distribution
        const eventTypeDistribution = await Conference.aggregate([
            {
                $match: {
                    startDate: { $gte: startOfMonth, $lte: endOfMonth },
                    bookingStatus: { $in: ['approved', 'confirmed', 'completed'] }
                }
            },
            {
                $group: {
                    _id: '$eventType',
                    count: { $sum: 1 },
                    revenue: { $sum: '$advancePaid' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        res.status(200).json({
            success: true,
            stats: {
                todayEvents,
                pendingApprovals,
                monthlyRevenue,
                monthlyTotalAmount,
                hallUtilization,
                upcomingEvents,
                eventTypeDistribution
            }
        });

    } catch (error) {
        console.error('Get conference dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get conference reports
// @route   GET /api/conference/reports
// @access  Private/Admin, Conference Staff
exports.getReports = async (req, res) => {
    try {
        const { startDate, endDate, groupBy = 'day', hallType } = req.query;

        const start = startDate ? new Date(startDate) : new Date();
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);

        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);

        const matchQuery = {
            startDate: { $gte: start, $lte: end },
            bookingStatus: { $in: ['approved', 'confirmed', 'completed'] }
        };

        if (hallType && hallType !== 'all') {
            matchQuery.hallType = hallType;
        }

        let groupFormat, sortFormat;
        switch (groupBy) {
            case 'day':
                groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$startDate' } };
                sortFormat = { _id: 1 };
                break;
            case 'month':
                groupFormat = { $dateToString: { format: '%Y-%m', date: '$startDate' } };
                sortFormat = { _id: 1 };
                break;
            case 'week':
                groupFormat = { $week: '$startDate' };
                sortFormat = { _id: 1 };
                break;
            default:
                groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$startDate' } };
                sortFormat = { _id: 1 };
        }

        // Revenue and bookings by time period
        const revenueData = await Conference.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: groupFormat,
                    revenue: { $sum: '$advancePaid' },
                    totalAmount: { $sum: '$amount' },
                    bookings: { $sum: 1 },
                    attendees: { $sum: '$attendees' }
                }
            },
            { $sort: sortFormat }
        ]);

        // Hall utilization data
        const hallData = await Conference.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$hallType',
                    bookings: { $sum: 1 },
                    revenue: { $sum: '$advancePaid' },
                    attendees: { $sum: '$attendees' },
                    utilization: { $avg: { $divide: ['$attendees', 100] } } // Assuming max capacity 100 for calculation
                }
            },
            { $sort: { bookings: -1 } }
        ]);

        // Event type analysis
        const eventTypeData = await Conference.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$eventType',
                    count: { $sum: 1 },
                    revenue: { $sum: '$advancePaid' },
                    avgAttendees: { $avg: '$attendees' },
                    avgDuration: { $avg: { $subtract: ['$endDate', '$startDate'] } }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Top clients
        const topClients = await Conference.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$clientName',
                    bookings: { $sum: 1 },
                    totalSpent: { $sum: '$advancePaid' },
                    lastBooking: { $max: '$startDate' }
                }
            },
            { $sort: { totalSpent: -1 } },
            { $limit: 10 }
        ]);

        // Daily trend for last 7 days
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);
        last7Days.setHours(0, 0, 0, 0);

        const dailyTrend = await Conference.aggregate([
            {
                $match: {
                    startDate: { $gte: last7Days, $lte: end },
                    bookingStatus: { $in: ['approved', 'confirmed', 'completed'] }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$startDate' } },
                    revenue: { $sum: '$advancePaid' },
                    bookings: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            { $limit: 7 }
        ]);

        res.status(200).json({
            success: true,
            revenueData,
            hallData,
            eventTypeData,
            topClients,
            dailyTrend,
            period: {
                start: start.toISOString(),
                end: end.toISOString(),
                groupBy
            }
        });

    } catch (error) {
        console.error('Get conference reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};