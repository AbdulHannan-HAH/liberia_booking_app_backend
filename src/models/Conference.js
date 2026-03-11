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
        required: false,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
        default: '' // Set default to empty string
    },
    phone: {
        type: String,
        required: false,
        trim: true,
        default: '' // Set default to empty string
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
        trim: true,
        default: ''
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required']
    },
    discount: {
        type: Number,
        default: 0,
        min: [0, 'Discount cannot be negative']
    },
    discountedAmount: {
        type: Number,
        default: 0
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
        trim: true,
        default: ''
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
    }
}, {
    timestamps: true
});

// Generate booking number before saving (Pool model ki tarah)
conferenceSchema.pre('save', async function () {
    // Generate booking number if not exists
    if (!this.bookingNumber) {
        const count = await this.constructor.countDocuments();
        this.bookingNumber = `CH-${Date.now().toString().slice(-6)}-${count + 1}`;
    }

    // Calculate discounted amount
    if (this.amount !== undefined && this.discount !== undefined) {
        this.discountedAmount = (this.amount || 0) - (this.discount || 0);
    }
});

// Virtual fields (optional - agar chahiye to)
conferenceSchema.virtual('netAmount').get(function () {
    return (this.amount || 0) - (this.discount || 0);
});

conferenceSchema.virtual('balanceDue').get(function () {
    const netAmount = (this.amount || 0) - (this.discount || 0);
    return netAmount - (this.advancePaid || 0);
});

// Ensure virtuals are included when converting to JSON
conferenceSchema.set('toJSON', { virtuals: true });
conferenceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Conference', conferenceSchema);