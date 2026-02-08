const mongoose = require('mongoose');

const conferenceHallSchema = new mongoose.Schema({
    hallId: {
        type: String,
        required: [true, 'Hall ID is required'],
        unique: true
    },
    name: {
        type: String,
        required: [true, 'Hall name is required'],
        trim: true
    },
    value: {
        type: String,
        required: [true, 'Value is required'],
        unique: true
    },
    capacity: {
        type: Number,
        required: [true, 'Capacity is required'],
        min: [1, 'Capacity must be at least 1']
    },
    hourlyRate: {
        type: Number,
        required: [true, 'Hourly rate is required'],
        min: [0, 'Hourly rate cannot be negative']
    },
    dailyRate: {
        type: Number,
        required: [true, 'Daily rate is required'],
        min: [0, 'Daily rate cannot be negative']
    },
    description: {
        type: String,
        required: [true, 'Description is required']
    },
    amenities: [{
        name: String,
        included: Boolean,
        extraCharge: Number
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    currentBookings: {
        type: Number,
        default: 0
    },
    maxDailyBookings: {
        type: Number,
        default: 3
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

// Virtual for available bookings today
conferenceHallSchema.virtual('availableToday').get(function () {
    return this.maxDailyBookings - this.currentBookings;
});

module.exports = mongoose.model('ConferenceHall', conferenceHallSchema);