const ConferenceHall = require('../models/ConferenceHall');

// @desc    Get all conference halls
// @route   GET /api/conference/halls
// @access  Private/Admin, Conference Staff
exports.getConferenceHalls = async (req, res) => {
    try {
        const halls = await ConferenceHall.find()
            .sort({ capacity: 1 })
            .lean();

        res.status(200).json({
            success: true,
            halls
        });
    } catch (error) {
        console.error('Get conference halls error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update conference hall
// @route   PUT /api/conference/halls/:id
// @access  Private/Admin
exports.updateConferenceHall = async (req, res) => {
    try {
        const { name, capacity, hourlyRate, dailyRate, description, maxDailyBookings, isActive } = req.body;

        const hall = await ConferenceHall.findById(req.params.id);
        if (!hall) {
            return res.status(404).json({
                success: false,
                message: 'Conference hall not found'
            });
        }

        if (name) hall.name = name;
        if (capacity !== undefined) hall.capacity = capacity;
        if (hourlyRate !== undefined) hall.hourlyRate = hourlyRate;
        if (dailyRate !== undefined) hall.dailyRate = dailyRate;
        if (description) hall.description = description;
        if (maxDailyBookings !== undefined) hall.maxDailyBookings = maxDailyBookings;
        if (isActive !== undefined) hall.isActive = isActive;

        await hall.save();

        res.status(200).json({
            success: true,
            message: 'Conference hall updated successfully',
            hall
        });
    } catch (error) {
        console.error('Update conference hall error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Conference hall not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Initialize default conference halls
// @route   POST /api/conference/halls/initialize
// @access  Private/Admin
exports.initializeConferenceHalls = async (req, res) => {
    try {
        const defaultHalls = [
            {
                hallId: 'HALL_A',
                name: 'Hall A',
                value: 'hall_a',
                capacity: 100,
                hourlyRate: 50,
                dailyRate: 400,
                description: 'Standard conference hall with basic AV equipment',
                amenities: [
                    { name: 'Projector', included: true, extraCharge: 0 },
                    { name: 'Sound System', included: true, extraCharge: 0 },
                    { name: 'Whiteboard', included: true, extraCharge: 0 },
                    { name: 'Stage Setup', included: false, extraCharge: 100 }
                ],
                maxDailyBookings: 3
            },
            {
                hallId: 'HALL_B',
                name: 'Hall B',
                value: 'hall_b',
                capacity: 50,
                hourlyRate: 40,
                dailyRate: 300,
                description: 'Medium-sized hall for meetings and seminars',
                amenities: [
                    { name: 'Projector', included: true, extraCharge: 0 },
                    { name: 'Sound System', included: true, extraCharge: 0 },
                    { name: 'Whiteboard', included: true, extraCharge: 0 }
                ],
                maxDailyBookings: 4
            },
            {
                hallId: 'GRAND_HALL',
                name: 'Grand Hall',
                value: 'grand_hall',
                capacity: 200,
                hourlyRate: 100,
                dailyRate: 800,
                description: 'Large hall for events and weddings',
                amenities: [
                    { name: 'Projector', included: true, extraCharge: 0 },
                    { name: 'Professional Sound System', included: true, extraCharge: 0 },
                    { name: 'Stage Lighting', included: true, extraCharge: 0 },
                    { name: 'Dance Floor', included: false, extraCharge: 200 }
                ],
                maxDailyBookings: 2
            },
            {
                hallId: 'MEETING_ROOM_1',
                name: 'Meeting Room 1',
                value: 'meeting_room_1',
                capacity: 20,
                hourlyRate: 25,
                dailyRate: 150,
                description: 'Small meeting room for board meetings',
                amenities: [
                    { name: 'TV Screen', included: true, extraCharge: 0 },
                    { name: 'Conference Phone', included: true, extraCharge: 0 },
                    { name: 'Whiteboard', included: true, extraCharge: 0 }
                ],
                maxDailyBookings: 5
            },
            {
                hallId: 'MEETING_ROOM_2',
                name: 'Meeting Room 2',
                value: 'meeting_room_2',
                capacity: 20,
                hourlyRate: 25,
                dailyRate: 150,
                description: 'Small meeting room for team meetings',
                amenities: [
                    { name: 'TV Screen', included: true, extraCharge: 0 },
                    { name: 'Whiteboard', included: true, extraCharge: 0 }
                ],
                maxDailyBookings: 5
            }
        ];

        const results = [];
        for (const hallData of defaultHalls) {
            const existing = await ConferenceHall.findOne({ value: hallData.value });
            if (!existing) {
                const hall = await ConferenceHall.create(hallData);
                results.push(hall);
            } else {
                // Update existing
                existing.capacity = hallData.capacity;
                existing.hourlyRate = hallData.hourlyRate;
                existing.dailyRate = hallData.dailyRate;
                existing.description = hallData.description;
                existing.maxDailyBookings = hallData.maxDailyBookings;
                await existing.save();
                results.push(existing);
            }
        }

        res.status(200).json({
            success: true,
            message: 'Conference halls initialized',
            initialized: results.length,
            halls: results
        });
    } catch (error) {
        console.error('Initialize conference halls error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};