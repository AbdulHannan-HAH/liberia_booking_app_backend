const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
    slotId: {
        type: String,
        required: [true, 'Slot ID is required'],
        unique: true
    },
    label: {
        type: String,
        required: [true, 'Label is required']
    },
    value: {
        type: String,
        required: [true, 'Value is required'],
        unique: true
    },
    startTime: {
        type: String,
        required: [true, 'Start time is required']
    },
    endTime: {
        type: String,
        required: [true, 'End time is required']
    },
    maxCapacity: {
        type: Number,
        required: [true, 'Max capacity is required'],
        min: [1, 'Capacity must be at least 1']
    },
    currentBookings: {
        type: Number,
        default: 0
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

// Virtual for available spots
timeSlotSchema.virtual('available').get(function () {
    return this.maxCapacity - this.currentBookings;
});

module.exports = mongoose.model('TimeSlot', timeSlotSchema);