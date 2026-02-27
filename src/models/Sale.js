const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
    menuItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1']
    },
    unitPrice: {
        type: Number,
        required: true
    },
    tax: {
        type: Number,
        default: 0
    },
    taxType: {
        type: String,
        enum: ['percentage', 'fixed'],
        default: 'percentage'
    },
    discount: {
        type: Number,
        default: 0
    },
    subtotal: {
        type: Number,
        required: true
    },
    total: {
        type: Number,
        required: true
    },
    notes: {
        type: String,
        trim: true
    }
});

const saleSchema = new mongoose.Schema({
    saleNumber: {
        type: String,
        unique: true
    },
    customerName: {
        type: String,
        trim: true,
        default: 'Guest'
    },
    customerPhone: {
        type: String,
        trim: true
    },
    customerEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    tableNumber: {
        type: String,
        trim: true
    },
    items: [saleItemSchema],
    subtotal: {
        type: Number,
        required: true
    },
    taxTotal: {
        type: Number,
        default: 0
    },
    discountTotal: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'upi', 'credit', 'other'],
        default: 'cash'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'refunded'],
        default: 'pending'
    },
    orderType: {
        type: String,
        enum: ['dine_in', 'takeaway', 'delivery'],
        default: 'dine_in'
    },
    notes: {
        type: String,
        trim: true
    },
    staffNotes: {
        type: String,
        trim: true
    },
    servedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Generate sale number before saving
saleSchema.pre('save', async function () {
    console.log('🔄 Generating sale number...');

    if (!this.saleNumber) {
        try {
            // Get count of documents to generate unique number
            const count = await this.constructor.countDocuments();

            // Generate sale number in format: RBS-YYMMDD-XXXX
            const date = new Date();
            const year = date.getFullYear().toString().slice(-2);
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');

            this.saleNumber = `RBS-${year}${month}${day}-${(count + 1).toString().padStart(4, '0')}`;

            console.log('✅ Sale number generated:', this.saleNumber);
        } catch (error) {
            console.error('❌ Error generating sale number:', error);
            // Fallback
            this.saleNumber = `RBS-${Date.now()}`;
        }
    }
});

// Index for searching
saleSchema.index({ saleNumber: 'text', customerName: 'text', customerPhone: 'text' });

module.exports = mongoose.model('Sale', saleSchema);