const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectDB = async () => {
    try {
        console.log('🔗 Connecting to MongoDB...');
        console.log('MongoDB URI:', process.env.MONGODB_URI);

        const conn = await mongoose.connect(process.env.MONGODB_URI);

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📊 Database: ${conn.connection.name}`);

        // Create default admin user if not exists
        await createDefaultAdmin();

        return conn;
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
};

const createDefaultAdmin = async () => {
    try {
        console.log('👤 Checking for default admin user...');

        // Load User model - from src/config to src/models
        const User = require('../models/User');
        console.log('✅ Loaded User model from ../models/User');

        // Check if admin exists by username OR email
        const adminExists = await User.findOne({
            $or: [
                { username: 'admin' },
                { email: 'admin@pool.com' }
            ]
        }).select('+password');

        if (!adminExists) {
            console.log('🔄 Creating default admin user...');

            const admin = new User({
                name: 'System Administrator',
                username: 'admin',
                email: 'admin@pool.com',
                password: 'admin123', // Will be hashed by pre-save hook
                role: 'admin',
                isActive: true
            });

            await admin.save();

            console.log('✅ Default admin user created!');
            console.log(`   Username: ${admin.username}`);
            console.log(`   Email: ${admin.email}`);
            console.log(`   Role: ${admin.role}`);
        } else {
            console.log('ℹ️ Admin user already exists');
            console.log(`   Username: ${adminExists.username}`);
            console.log(`   Email: ${adminExists.email}`);
            console.log(`   Role: ${adminExists.role}`);
            console.log(`   Active: ${adminExists.isActive}`);

            if (adminExists.password) {
                console.log(`   Password hash length: ${adminExists.password.length}`);
                console.log(`   Password hash: ${adminExists.password.substring(0, 30)}...`);

                // Test the password
                const isPasswordCorrect = await bcrypt.compare('admin123', adminExists.password);
                console.log(`   Password "admin123" matches: ${isPasswordCorrect}`);
            } else {
                console.log(`   ❌ NO PASSWORD FIELD!`);
            }
        }
    } catch (error) {
        console.error('❌ Error creating default admin:', error.message);
        console.error('Stack:', error.stack);
    }
};

module.exports = connectDB;