const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true
        },
        username: {
            type: String,
            required: [true, 'Username is required'],
            unique: true,
            lowercase: true,
            trim: true
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false
        },
        role: {
            type: String,
            enum: ['admin', 'pool_staff', 'conference_staff', 'hotel_staff', 'restaurant_staff'],
            default: 'pool_staff'
        },
        isActive: {
            type: Boolean,
            default: true
        },
        lastLogin: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

//
// 🔹 PRE-SAVE HOOK — HASH PASSWORD (CORRECT)
//
userSchema.pre('save', async function () {
    console.log('🔄 User pre-save hook triggered');

    // Only hash if password is new or modified
    if (!this.isModified('password')) {
        console.log('   Password not modified, skipping hash');
        return;
    }

    console.log('   Hashing password...');
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('   ✅ Password hashed successfully');
});

//
// 🔹 COMPARE PASSWORD METHOD
//
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

//
// 🔹 REMOVE PASSWORD FROM JSON OUTPUT
//
userSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;