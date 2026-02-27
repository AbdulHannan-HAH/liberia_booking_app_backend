const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Item name is required'],
        trim: true
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['cold_drink', 'soft_drink', 'beer', 'wine', 'spirits', 'cocktails', 'snacks', 'meals', 'desserts']
    },
    categoryDisplay: {
        type: String,
        required: [true, 'Category display name is required']
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    cost: {
        type: Number,
        default: 0,
        min: [0, 'Cost cannot be negative']
    },
    tax: {
        type: Number,
        default: 0,
        min: [0, 'Tax cannot be negative']
    },
    taxType: {
        type: String,
        enum: ['percentage', 'fixed'],
        default: 'percentage'
    },
    description: {
        type: String,
        trim: true
    },
    unit: {
        type: String,
        default: 'piece',
        enum: ['piece', 'glass', 'bottle', 'plate', 'bowl', 'ml', 'ltr']
    },
    stockQuantity: {
        type: Number,
        default: 0,
        min: [0, 'Stock cannot be negative']
    },
    trackInventory: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isPopular: {
        type: Boolean,
        default: false
    },
    image: {
        type: String,
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
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

// Index for search
menuItemSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('MenuItem', menuItemSchema);