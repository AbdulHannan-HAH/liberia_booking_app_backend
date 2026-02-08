// models/RoomType.js
const mongoose = require('mongoose');

const roomTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Room type name is required'],
        unique: true
    },
    description: {
        type: String,
        required: [true, 'Description is required']
    },
    basePrice: {
        type: Number,
        required: [true, 'Base price is required'],
        min: [0, 'Price cannot be negative']
    },
    maxOccupancy: {
        type: Number,
        required: [true, 'Max occupancy is required'],
        min: [1, 'Must accommodate at least 1 person']
    },
    amenities: [{
        type: String
    }],
    roomCount: {
        type: Number,
        default: 0
    },
    occupiedCount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    images: [{
        type: String
    }],
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

module.exports = mongoose.model('RoomType', roomTypeSchema);