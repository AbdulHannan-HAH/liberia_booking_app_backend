// models/Reservation.js
const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
    guestName: {
        type: String,
        required: [true, 'Guest name is required'],
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
    checkIn: {
        type: Date,
        required: [true, 'Check-in date is required']
    },
    checkOut: {
        type: Date,
        required: [true, 'Check-out date is required']
    },
    actualCheckIn: {
        type: Date
    },
    actualCheckOut: {
        type: Date
    },
    roomType: {
        type: String,
        required: [true, 'Room type is required']
    },
    roomNumber: {
        type: String,
        required: [true, 'Room number is required']
    },
    adults: {
        type: Number,
        required: [true, 'Number of adults is required'],
        min: [1, 'At least 1 adult required'],
        max: [4, 'Maximum 4 adults per room']
    },
    children: {
        type: Number,
        default: 0,
        min: [0, 'Children cannot be negative'],
        max: [3, 'Maximum 3 children per room']
    },
    totalNights: {
        type: Number,
        required: [true, 'Total nights is required']
    },
    roomRate: {
        type: Number,
        required: [true, 'Room rate is required']
    },
    extraCharges: [{
        service: String,
        amount: Number,
        quantity: Number,
        date: {
            type: Date,
            default: Date.now
        }
    }],
    subTotal: {
        type: Number,
        required: [true, 'Subtotal is required']
    },
    tax: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        required: [true, 'Total amount is required']
    },
    paymentStatus: {
        type: String,
        enum: ['paid', 'pending', 'partial'],
        default: 'pending'
    },
    reservationStatus: {
        type: String,
        enum: ['confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'],
        default: 'confirmed'
    },
    reservationNumber: {
        type: String,
        unique: true
    },
    specialRequests: {
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

// Generate reservation number before saving
reservationSchema.pre('save', async function () {
    if (!this.reservationNumber) {
        const count = await this.constructor.countDocuments();
        this.reservationNumber = `HR-${Date.now().toString().slice(-6)}-${count + 1}`;
    }
});

module.exports = mongoose.model('Reservation', reservationSchema);