const mongoose = require('mongoose');

const conferenceSchema = new mongoose.Schema({
    eventName: {
        type: String,
        required: [true, 'Event name is required'],
        trim: true
    },
    clientName: {
        type: String,
        required: [true, 'Client name is required'],
        trim: true
    },
    company: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    hallType: {
        type: String,
        required: [true, 'Hall type is required'],
        enum: ['hall_a', 'hall_b', 'grand_hall', 'meeting_room_1', 'meeting_room_2']
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required']
    },
    startTime: {
        type: String,
        required: [true, 'Start time is required']
    },
    endTime: {
        type: String,
        required: [true, 'End time is required']
    },
    eventType: {
        type: String,
        required: [true, 'Event type is required'],
        enum: ['meeting', 'seminar', 'conference', 'wedding', 'party', 'training', 'exhibition']
    },
    attendees: {
        type: Number,
        required: [true, 'Number of attendees is required'],
        min: [1, 'At least 1 attendee required'],
        max: [500, 'Maximum 500 attendees per booking']
    },
    cateringRequired: {
        type: Boolean,
        default: false
    },
    equipmentRequired: {
        type: Boolean,
        default: false
    },
    specialRequirements: {
        type: String,
        trim: true
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required']
    },
    advancePaid: {
        type: Number,
        default: 0
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'partial', 'paid', 'cancelled', 'refunded'],
        default: 'pending'
    },
    bookingStatus: {
        type: String,
        enum: ['pending', 'approved', 'confirmed', 'completed', 'cancelled'],
        default: 'pending'
    },
    bookingNumber: {
        type: String,
        unique: true
    },
    notes: {
        type: String,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    },
    invoiceNumber: {
        type: String
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

// TEMPORARY FIX - Remove pre-save hook entirely
// Don't use any pre-save hook for now
// conferenceSchema.pre('save', function(next) {
//     // Empty for now
//     next();
// });

module.exports = mongoose.model('Conference', conferenceSchema);