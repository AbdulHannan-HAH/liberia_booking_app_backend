const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Equipment name is required'],
        trim: true
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['audio', 'video', 'furniture', 'lighting', 'other']
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [0, 'Quantity cannot be negative']
    },
    availableQuantity: {
        type: Number,
        default: 0
    },
    rentalRate: {
        type: Number,
        required: [true, 'Rental rate is required'],
        min: [0, 'Rental rate cannot be negative']
    },
    unit: {
        type: String,
        enum: ['hour', 'day', 'event'],
        default: 'event'
    },
    description: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Equipment', equipmentSchema);