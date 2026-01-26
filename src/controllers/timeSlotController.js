const TimeSlot = require('../models/TimeSlot');

// @desc    Get all time slots
// @route   GET /api/pool/time-slots
// @access  Private/Admin, Pool Staff
exports.getTimeSlots = async (req, res) => {
    try {
        const timeSlots = await TimeSlot.find()
            .sort({ startTime: 1 })
            .lean();

        // Add virtual available field
        const slotsWithAvailable = timeSlots.map(slot => ({
            ...slot,
            available: slot.maxCapacity - slot.currentBookings
        }));

        res.status(200).json({
            success: true,
            timeSlots: slotsWithAvailable
        });
    } catch (error) {
        console.error('Get time slots error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update time slot
// @route   PUT /api/pool/time-slots/:id
// @access  Private/Admin
exports.updateTimeSlot = async (req, res) => {
    try {
        const { label, maxCapacity, isActive } = req.body;

        const timeSlot = await TimeSlot.findById(req.params.id);
        if (!timeSlot) {
            return res.status(404).json({
                success: false,
                message: 'Time slot not found'
            });
        }

        if (label) timeSlot.label = label;
        if (maxCapacity !== undefined) {
            if (maxCapacity < timeSlot.currentBookings) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot set capacity lower than current bookings (${timeSlot.currentBookings})`
                });
            }
            timeSlot.maxCapacity = maxCapacity;
        }
        if (isActive !== undefined) timeSlot.isActive = isActive;

        await timeSlot.save();

        res.status(200).json({
            success: true,
            message: 'Time slot updated successfully',
            timeSlot: {
                ...timeSlot.toObject(),
                available: timeSlot.maxCapacity - timeSlot.currentBookings
            }
        });
    } catch (error) {
        console.error('Update time slot error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Time slot not found'
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

// @desc    Initialize default time slots
// @route   POST /api/pool/time-slots/initialize
// @access  Private/Admin
exports.initializeTimeSlots = async (req, res) => {
    try {
        const defaultSlots = [
            {
                slotId: '1',
                label: '06:00 AM - 09:00 AM',
                value: '06:00-09:00',
                startTime: '06:00',
                endTime: '09:00',
                maxCapacity: 50,
                currentBookings: 12
            },
            {
                slotId: '2',
                label: '09:00 AM - 12:00 PM',
                value: '09:00-12:00',
                startTime: '09:00',
                endTime: '12:00',
                maxCapacity: 50,
                currentBookings: 8
            },
            {
                slotId: '3',
                label: '12:00 PM - 03:00 PM',
                value: '12:00-15:00',
                startTime: '12:00',
                endTime: '15:00',
                maxCapacity: 50,
                currentBookings: 15
            },
            {
                slotId: '4',
                label: '03:00 PM - 06:00 PM',
                value: '15:00-18:00',
                startTime: '15:00',
                endTime: '18:00',
                maxCapacity: 50,
                currentBookings: 20
            },
            {
                slotId: '5',
                label: '06:00 PM - 09:00 PM',
                value: '18:00-21:00',
                startTime: '18:00',
                endTime: '21:00',
                maxCapacity: 50,
                currentBookings: 25
            }
        ];

        const results = [];
        for (const slotData of defaultSlots) {
            const existing = await TimeSlot.findOne({ value: slotData.value });
            if (!existing) {
                const slot = await TimeSlot.create(slotData);
                results.push(slot);
            } else {
                // Update existing
                existing.maxCapacity = slotData.maxCapacity;
                existing.currentBookings = slotData.currentBookings;
                await existing.save();
                results.push(existing);
            }
        }

        res.status(200).json({
            success: true,
            message: 'Time slots initialized',
            initialized: results.length,
            timeSlots: results
        });
    } catch (error) {
        console.error('Initialize time slots error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};