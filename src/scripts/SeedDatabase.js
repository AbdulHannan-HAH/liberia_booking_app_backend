// scripts/seedDatabase.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const TicketPrice = require('../models/TicketPrice');
const TimeSlot = require('../models/TimeSlot');

// Load environment variables
dotenv.config();

const connectDB = async () => {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected');
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        process.exit(1);
    }
};

const seedDatabase = async () => {
    try {
        await connectDB();

        console.log('🚀 Seeding database...');

        // 1. Create Admin User
        const adminUser = {
            name: 'Admin User',
            username: 'admin',
            email: 'admin@example.com',
            password: 'admin123',
            role: 'admin',
            isActive: true
        };

        const existingAdmin = await User.findOne({ username: 'admin' });
        if (existingAdmin) {
            console.log('✅ Admin user already exists');
        } else {
            await User.create(adminUser);
            console.log('✅ Admin user created');
        }

        // 2. Create Ticket Prices
        const ticketPrices = [
            {
                passType: 'hourly',
                price: 15,
                description: 'Per person per hour',
                maxPersons: 1,
                isActive: true
            },
            {
                passType: 'daily',
                price: 25,
                description: 'Full day access per person',
                maxPersons: 1,
                isActive: true
            },
            {
                passType: 'family',
                price: 60,
                description: 'Up to 4 family members',
                maxPersons: 4,
                isActive: true
            }
        ];

        for (const price of ticketPrices) {
            await TicketPrice.findOneAndUpdate(
                { passType: price.passType },
                price,
                { upsert: true }
            );
        }
        console.log('✅ Ticket prices created');

        // 3. Create Time Slots
        const timeSlots = [
            {
                slotId: '1',
                label: '06:00 AM - 09:00 AM',
                value: '06:00-09:00',
                startTime: '06:00',
                endTime: '09:00',
                maxCapacity: 50,
                currentBookings: 12,
                isActive: true
            },
            {
                slotId: '2',
                label: '09:00 AM - 12:00 PM',
                value: '09:00-12:00',
                startTime: '09:00',
                endTime: '12:00',
                maxCapacity: 50,
                currentBookings: 8,
                isActive: true
            },
            {
                slotId: '3',
                label: '12:00 PM - 03:00 PM',
                value: '12:00-15:00',
                startTime: '12:00',
                endTime: '15:00',
                maxCapacity: 50,
                currentBookings: 15,
                isActive: true
            },
            {
                slotId: '4',
                label: '03:00 PM - 06:00 PM',
                value: '15:00-18:00',
                startTime: '15:00',
                endTime: '18:00',
                maxCapacity: 50,
                currentBookings: 20,
                isActive: true
            },
            {
                slotId: '5',
                label: '06:00 PM - 09:00 PM',
                value: '18:00-21:00',
                startTime: '18:00',
                endTime: '21:00',
                maxCapacity: 50,
                currentBookings: 25,
                isActive: true
            }
        ];

        for (const slot of timeSlots) {
            await TimeSlot.findOneAndUpdate(
                { value: slot.value },
                slot,
                { upsert: true }
            );
        }
        console.log('✅ Time slots created');

        console.log('\n🎉 Database seeding completed!');
        console.log('\n🔑 Login Credentials:');
        console.log('   Username: admin');
        console.log('   Password: admin123');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding error:', error.message);
        process.exit(1);
    }
};

seedDatabase();