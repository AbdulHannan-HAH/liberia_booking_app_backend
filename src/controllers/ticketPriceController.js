const TicketPrice = require('../models/TicketPrice');

// @desc    Get all ticket prices
// @route   GET /api/pool/ticket-prices
// @access  Private/Admin, Pool Staff
exports.getTicketPrices = async (req, res) => {
    try {
        const ticketPrices = await TicketPrice.find()
            .sort({ passType: 1 })
            .lean();

        res.status(200).json({
            success: true,
            ticketPrices
        });
    } catch (error) {
        console.error('Get ticket prices error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update ticket price
// @route   PUT /api/pool/ticket-prices/:id
// @access  Private/Admin
exports.updateTicketPrice = async (req, res) => {
    try {
        const { price, description, maxPersons, isActive } = req.body;

        const ticketPrice = await TicketPrice.findById(req.params.id);
        if (!ticketPrice) {
            return res.status(404).json({
                success: false,
                message: 'Ticket price not found'
            });
        }

        // Validate price
        if (price !== undefined) {
            if (price < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Price cannot be negative'
                });
            }
            ticketPrice.price = price;
        }

        if (description) ticketPrice.description = description;
        if (maxPersons !== undefined) ticketPrice.maxPersons = maxPersons;
        if (isActive !== undefined) ticketPrice.isActive = isActive;
        ticketPrice.updatedBy = req.user._id;

        await ticketPrice.save();

        res.status(200).json({
            success: true,
            message: 'Ticket price updated successfully',
            ticketPrice
        });
    } catch (error) {
        console.error('Update ticket price error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Ticket price not found'
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

// @desc    Initialize default ticket prices
// @route   POST /api/pool/ticket-prices/initialize
// @access  Private/Admin
exports.initializeTicketPrices = async (req, res) => {
    try {
        const defaultPrices = [
            {
                passType: 'hourly',
                price: 15,
                description: 'Per person per hour',
                maxPersons: 1
            },
            {
                passType: 'daily',
                price: 25,
                description: 'Full day access per person',
                maxPersons: 1
            },
            {
                passType: 'family',
                price: 60,
                description: 'Up to 4 family members',
                maxPersons: 4
            }
        ];

        const results = [];
        for (const priceData of defaultPrices) {
            const existing = await TicketPrice.findOne({ passType: priceData.passType });
            if (!existing) {
                priceData.updatedBy = req.user._id;
                const ticket = await TicketPrice.create(priceData);
                results.push(ticket);
            }
        }

        res.status(200).json({
            success: true,
            message: 'Ticket prices initialized',
            initialized: results.length,
            ticketPrices: results
        });
    } catch (error) {
        console.error('Initialize ticket prices error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};