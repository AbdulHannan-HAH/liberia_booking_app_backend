// models/Room.js - UPDATED
const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    roomNumber: {
        type: String,
        required: [true, 'Room number is required'],
        unique: true
    },
    roomType: {
        type: String,
        required: [true, 'Room type is required']
    },
    floor: {
        type: Number,
        required: [true, 'Floor is required'],
        min: [1, 'Floor must be at least 1']
    },
    status: {
        type: String,
        enum: ['available', 'occupied', 'maintenance', 'cleaning'],
        default: 'available'
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        default: 0
    },
    features: [{
        type: String
    }],
    lastCleaned: {
        type: Date,
        default: Date.now
    },
    nextCleaning: {
        type: Date,
        default: () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
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

module.exports = mongoose.model('Room', roomSchema);