const mongoose = require('mongoose');

const poolSchema = new mongoose.Schema({
    customerName: {
        type: String,
        required: [true, 'Customer name is required'],
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
    date: {
        type: Date,
        required: [true, 'Booking date is required']
    },
    timeSlot: {
        type: String,
        required: [true, 'Time slot is required'],
        enum: ['06:00-09:00', '09:00-12:00', '12:00-15:00', '15:00-18:00', '18:00-21:00']
    },
    passType: {
        type: String,
        required: [true, 'Pass type is required'],
        enum: ['hourly', 'daily', 'family']
    },
    persons: {
        type: Number,
        required: [true, 'Number of persons is required'],
        min: [1, 'At least 1 person required'],
        max: [10, 'Maximum 10 persons per booking']
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required']
    },
    paymentStatus: {
        type: String,
        enum: ['paid', 'pending', 'cancelled'],
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

// Generate booking number before saving
poolSchema.pre('save', async function () {
    if (!this.bookingNumber) {
        const count = await this.constructor.countDocuments();
        this.bookingNumber = `PB-${Date.now().toString().slice(-6)}-${count + 1}`;
    }
});

module.exports = mongoose.model('Pool', poolSchema);