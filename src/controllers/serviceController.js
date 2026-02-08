// src/controllers/serviceController.js
const Service = require('../models/Service');

// @desc    Get all services
// @route   GET /api/hotel/services
// @access  Private/Admin, Hotel Staff
exports.getServices = async (req, res) => {
    try {
        const services = await Service.find({ isAvailable: true })
            .sort({ category: 1, name: 1 })
            .lean();

        res.status(200).json({
            success: true,
            services
        });
    } catch (error) {
        console.error('Get services error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update service
// @route   PUT /api/hotel/services/:id
// @access  Private/Admin
exports.updateService = async (req, res) => {
    try {
        const {
            name,
            description,
            price,
            category,
            isAvailable
        } = req.body;

        const service = await Service.findById(req.params.id);
        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        // Update fields
        if (name) service.name = name;
        if (description) service.description = description;
        if (price) service.price = price;
        if (category) service.category = category;
        if (isAvailable !== undefined) service.isAvailable = isAvailable;

        await service.save();

        res.status(200).json({
            success: true,
            message: 'Service updated successfully',
            service
        });
    } catch (error) {
        console.error('Update service error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
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

// @desc    Create new service
// @route   POST /api/hotel/services
// @access  Private/Admin
exports.createService = async (req, res) => {
    try {
        const {
            name,
            description,
            price,
            category
        } = req.body;

        // Validate required fields
        if (!name || !description || !price || !category) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Check if service already exists
        const existingService = await Service.findOne({ name });
        if (existingService) {
            return res.status(400).json({
                success: false,
                message: 'Service with this name already exists'
            });
        }

        // Create service
        const service = await Service.create({
            name,
            description,
            price,
            category,
            isAvailable: true
        });

        res.status(201).json({
            success: true,
            message: 'Service created successfully',
            service
        });

    } catch (error) {
        console.error('Create service error:', error);
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

// @desc    Initialize default services
// @route   POST /api/hotel/services/initialize
// @access  Private/Admin
exports.initializeServices = async (req, res) => {
    try {
        const defaultServices = [
            {
                name: 'Breakfast Buffet',
                description: 'Continental breakfast buffet',
                price: 15,
                category: 'food'
            },
            {
                name: 'Lunch Special',
                description: 'Daily lunch special from the restaurant',
                price: 20,
                category: 'food'
            },
            {
                name: 'Dinner Package',
                description: 'Three-course dinner package',
                price: 35,
                category: 'food'
            },
            {
                name: 'Room Service',
                description: '24-hour room service',
                price: 10,
                category: 'food'
            },
            {
                name: 'Mineral Water',
                description: 'Bottled mineral water',
                price: 2,
                category: 'beverage'
            },
            {
                name: 'Soft Drinks',
                description: 'Assorted soft drinks',
                price: 3,
                category: 'beverage'
            },
            {
                name: 'Wine Selection',
                description: 'Premium wine selection',
                price: 25,
                category: 'beverage'
            },
            {
                name: 'Spa Treatment',
                description: 'Relaxing spa treatment',
                price: 50,
                category: 'spa'
            },
            {
                name: 'Massage Therapy',
                description: 'Professional massage therapy',
                price: 40,
                category: 'spa'
            },
            {
                name: 'Laundry Service',
                description: 'Express laundry service',
                price: 15,
                category: 'laundry'
            },
            {
                name: 'Dry Cleaning',
                description: 'Professional dry cleaning',
                price: 20,
                category: 'laundry'
            },
            {
                name: 'Airport Transfer',
                description: 'Hotel to airport transfer',
                price: 25,
                category: 'transport'
            },
            {
                name: 'City Tour',
                description: 'Guided city tour',
                price: 30,
                category: 'transport'
            }
        ];

        const results = [];
        for (const serviceData of defaultServices) {
            const existing = await Service.findOne({ name: serviceData.name });
            if (!existing) {
                const service = await Service.create(serviceData);
                results.push(service);
            } else {
                // Update existing
                Object.assign(existing, serviceData);
                await existing.save();
                results.push(existing);
            }
        }

        res.status(200).json({
            success: true,
            message: 'Services initialized',
            initialized: results.length,
            services: results
        });
    } catch (error) {
        console.error('Initialize services error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};