const mongoose = require('mongoose');

const ticketPriceSchema = new mongoose.Schema({
    passType: {
        type: String,
        required: [true, 'Pass type is required'],
        enum: ['hourly', 'daily', 'family'],
        unique: true
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    description: {
        type: String,
        required: [true, 'Description is required']
    },
    maxPersons: {
        type: Number,
        default: 1
    },
    isActive: {
        type: Boolean,
        default: true
    },
    updatedBy: {
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

module.exports = mongoose.model('TicketPrice', ticketPriceSchema);