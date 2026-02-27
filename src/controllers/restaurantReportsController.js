const Sale = require('../models/Sale');
const MenuItem = require('../models/MenuItem');

// @desc    Get dashboard stats
// @route   GET /api/restaurant/dashboard
// @access  Private/Admin, Restaurant Staff
exports.getDashboardStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Today's sales
        const todaySales = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: today, $lt: tomorrow },
                    paymentStatus: { $ne: 'cancelled' }
                }
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    revenue: { $sum: '$totalAmount' },
                    items: { $sum: { $size: '$items' } }
                }
            }
        ]);

        // Pending payments
        const pendingPayments = await Sale.countDocuments({
            paymentStatus: 'pending',
            createdAt: { $gte: today }
        });

        // Active orders (pending or preparing)
        const activeOrders = await Sale.countDocuments({
            orderStatus: { $in: ['pending', 'preparing'] }
        });

        // Popular items today
        const popularItems = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: today, $lt: tomorrow },
                    paymentStatus: { $ne: 'cancelled' }
                }
            },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.menuItemId',
                    name: { $first: '$items.name' },
                    category: { $first: '$items.category' },
                    quantity: { $sum: '$items.quantity' },
                    revenue: { $sum: '$items.total' }
                }
            },
            { $sort: { quantity: -1 } },
            { $limit: 5 }
        ]);

        // Category breakdown
        const categoryBreakdown = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: today, $lt: tomorrow },
                    paymentStatus: { $ne: 'cancelled' }
                }
            },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.category',
                    quantity: { $sum: '$items.quantity' },
                    revenue: { $sum: '$items.total' }
                }
            }
        ]);

        // Recent sales
        const recentSales = await Sale.find({
            paymentStatus: { $ne: 'cancelled' }
        })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('servedBy', 'name')
            .lean();

        // Order status breakdown
        const orderStatusBreakdown = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: today, $lt: tomorrow },
                    paymentStatus: { $ne: 'cancelled' }
                }
            },
            {
                $group: {
                    _id: '$orderStatus',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            stats: {
                todaySales: todaySales[0]?.count || 0,
                todayRevenue: todaySales[0]?.revenue || 0,
                todayItems: todaySales[0]?.items || 0,
                pendingPayments,
                activeOrders,
                popularItems,
                categoryBreakdown,
                recentSales,
                orderStatusBreakdown
            }
        });

    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get reports data
// @route   GET /api/restaurant/reports
// @access  Private/Admin, Restaurant Staff
exports.getReports = async (req, res) => {
    try {
        const { startDate, endDate, groupBy = 'day' } = req.query;

        const start = startDate ? new Date(startDate) : new Date();
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);

        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);

        let groupFormat;
        switch (groupBy) {
            case 'day':
                groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
                break;
            case 'week':
                groupFormat = { $week: '$createdAt' };
                break;
            case 'month':
                groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
                break;
            default:
                groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        }

        // Revenue by period
        const revenueData = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    paymentStatus: 'paid'
                }
            },
            {
                $group: {
                    _id: groupFormat,
                    revenue: { $sum: '$totalAmount' },
                    orders: { $sum: 1 },
                    items: { $sum: { $size: '$items' } }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Top selling items
        const topItems = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    paymentStatus: 'paid'
                }
            },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.menuItemId',
                    name: { $first: '$items.name' },
                    category: { $first: '$items.category' },
                    quantity: { $sum: '$items.quantity' },
                    revenue: { $sum: '$items.total' }
                }
            },
            { $sort: { quantity: -1 } },
            { $limit: 10 }
        ]);

        // Category performance
        const categoryPerformance = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    paymentStatus: 'paid'
                }
            },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.category',
                    quantity: { $sum: '$items.quantity' },
                    revenue: { $sum: '$items.total' },
                    orders: { $addToSet: '$_id' }
                }
            },
            {
                $project: {
                    _id: 1,
                    quantity: 1,
                    revenue: 1,
                    orderCount: { $size: '$orders' }
                }
            },
            { $sort: { revenue: -1 } }
        ]);

        // Hourly breakdown
        const hourlyBreakdown = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    paymentStatus: 'paid'
                }
            },
            {
                $group: {
                    _id: { $hour: '$createdAt' },
                    orders: { $sum: 1 },
                    revenue: { $sum: '$totalAmount' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Payment method distribution
        const paymentMethodData = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    paymentStatus: 'paid'
                }
            },
            {
                $group: {
                    _id: '$paymentMethod',
                    count: { $sum: 1 },
                    total: { $sum: '$totalAmount' }
                }
            }
        ]);

        // Order type distribution
        const orderTypeData = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    paymentStatus: 'paid'
                }
            },
            {
                $group: {
                    _id: '$orderType',
                    count: { $sum: 1 },
                    revenue: { $sum: '$totalAmount' }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            revenueData,
            topItems,
            categoryPerformance,
            hourlyBreakdown,
            paymentMethodData,
            orderTypeData,
            period: {
                start: start.toISOString(),
                end: end.toISOString(),
                groupBy
            }
        });

    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};