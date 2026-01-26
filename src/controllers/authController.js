const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

console.log('📍 authController.js location: src/controllers/authController.js');

// CORRECT PATH: From src/controllers to src/models
const User = require('../models/User');
console.log('✅ Loaded User model from ../models/User');

// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET || 'dev_secret_key_123',
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        console.log('\n🔐 ========== LOGIN ATTEMPT ==========');
        console.log('Time:', new Date().toISOString());

        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            console.log('❌ Missing username or password');
            return res.status(400).json({
                success: false,
                message: 'Please provide username and password'
            });
        }

        console.log(`🔍 Searching for user: "${username}"`);

        // Try exact username match first
        let user = await User.findOne({ username: username }).select('+password');

        if (!user) {
            console.log(`❌ User not found with exact username: "${username}"`);

            // Try case-insensitive username
            user = await User.findOne({
                username: { $regex: new RegExp(`^${username}$`, 'i') }
            }).select('+password');

            if (!user) {
                console.log(`❌ User not found with case-insensitive username: "${username}"`);

                // Try exact email
                user = await User.findOne({ email: username }).select('+password');

                if (!user) {
                    // Try case-insensitive email
                    user = await User.findOne({
                        email: { $regex: new RegExp(`^${username}$`, 'i') }
                    }).select('+password');

                    if (!user) {
                        console.log(`❌ User not found with email either: "${username}"`);
                        return res.status(401).json({
                            success: false,
                            error: 'Invalid credentials',
                            message: 'Invalid credentials'
                        });
                    } else {
                        console.log(`✅ User found by email (case-insensitive): ${user.email}`);
                    }
                } else {
                    console.log(`✅ User found by email (exact): ${user.email}`);
                }
            } else {
                console.log(`✅ User found by username (case-insensitive): ${user.username}`);
            }
        } else {
            console.log(`✅ User found by username (exact): ${user.username}`);
        }

        console.log('\n👤 User Details:');
        console.log('   ID:', user._id);
        console.log('   Username:', user.username);
        console.log('   Email:', user.email);
        console.log('   Role:', user.role);
        console.log('   Active:', user.isActive);

        if (user.password) {
            console.log('   Password hash exists: Yes');
            console.log('   Password hash length:', user.password.length);
            console.log('   Password hash starts with:', user.password.substring(0, 20) + '...');
        } else {
            console.log('   ❌ NO PASSWORD FIELD!');
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
                message: 'Invalid credentials'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            console.log('❌ User account is inactive');
            return res.status(401).json({
                success: false,
                message: 'Your account has been deactivated'
            });
        }

        console.log('\n🔑 Starting password verification...');
        console.log('   Input password length:', password.length);

        let isPasswordMatch = false;

        // Method 1: Use comparePassword method
        if (typeof user.comparePassword === 'function') {
            try {
                console.log('   Trying comparePassword method...');
                isPasswordMatch = await user.comparePassword(password);
                console.log(`   comparePassword result: ${isPasswordMatch}`);
            } catch (compareError) {
                console.log(`   comparePassword error: ${compareError.message}`);
            }
        } else {
            console.log('   ⚠️ comparePassword method not available on user object');
        }

        // Method 2: Direct bcrypt comparison
        if (!isPasswordMatch) {
            try {
                console.log('   Trying direct bcrypt.compare...');
                isPasswordMatch = await bcrypt.compare(password, user.password);
                console.log(`   bcrypt.compare result: ${isPasswordMatch}`);
            } catch (bcryptError) {
                console.log(`   bcrypt.compare error: ${bcryptError.message}`);
            }
        }

        if (!isPasswordMatch) {
            console.log('❌ Password does not match');
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
                message: 'Invalid credentials'
            });
        }

        console.log('✅ Password verified successfully!');

        // Update last login - handle potential pre-save hook errors
        try {
            user.lastLogin = Date.now();
            await user.save();
            console.log('✅ Last login updated');
        } catch (saveError) {
            console.log('⚠️ Could not update last login:', saveError.message);
            // Continue anyway - this is not critical
        }

        // Generate token
        const token = generateToken(user._id);
        console.log(`✅ Token generated (${token.length} chars)`);

        // Prepare user data without password
        const userData = user.toJSON();

        console.log('\n🎉 ========== LOGIN SUCCESSFUL ==========');
        console.log(`   User: ${userData.name} (${userData.role})`);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: userData
        });

    } catch (error) {
        console.error('\n⚠️ ========== LOGIN ERROR ==========');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);

        // Check if it's a pre-save hook error
        if (error.message.includes('next is not a function')) {
            console.error('\n🔧 DIAGNOSIS: This is a pre-save hook error in User model!');
            console.error('   The "next" parameter is missing or not being called properly.');
        }

        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Server error during login'
        });
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};