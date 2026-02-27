const Sale = require('../models/Sale');
const MenuItem = require('../models/MenuItem');

// @desc    Get all sales
// @route   GET /api/restaurant/sales
// @access  Private/Admin, Restaurant Staff
exports.getSales = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            paymentStatus,
            orderType,
            search,
            startDate,
            endDate,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const query = {};

        // Filter by order status
        if (status && status !== 'all') {
            query.orderStatus = status;
        }

        // Filter by payment status
        if (paymentStatus && paymentStatus !== 'all') {
            query.paymentStatus = paymentStatus;
        }

        // Filter by order type
        if (orderType && orderType !== 'all') {
            query.orderType = orderType;
        }

        // Date range filter
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                query.createdAt.$gte = start;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        // Search functionality
        if (search) {
            query.$or = [
                { saleNumber: { $regex: search, $options: 'i' } },
                { customerName: { $regex: search, $options: 'i' } },
                { customerPhone: { $regex: search, $options: 'i' } },
                { tableNumber: { $regex: search, $options: 'i' } }
            ];
        }

        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const sales = await Sale.find(query)
            .sort(sort)
            .limit(parseInt(limit))
            .skip(skip)
            .populate('createdBy', 'name')
            .populate('servedBy', 'name')
            .lean();

        const total = await Sale.countDocuments(query);

        res.status(200).json({
            success: true,
            count: sales.length,
            total,
            totalPages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page),
            sales
        });

    } catch (error) {
        console.error('Get sales error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get single sale
// @route   GET /api/restaurant/sales/:id
// @access  Private/Admin, Restaurant Staff
exports.getSale = async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id)
            .populate('createdBy', 'name')
            .populate('servedBy', 'name')
            .populate('items.menuItemId')
            .lean();

        if (!sale) {
            return res.status(404).json({
                success: false,
                message: 'Sale not found'
            });
        }

        res.status(200).json({
            success: true,
            sale
        });

    } catch (error) {
        console.error('Get sale error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Sale not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Create new sale - FIXED VERSION
// @route   POST /api/restaurant/sales
// @access  Private/Admin, Restaurant Staff
exports.createSale = async (req, res) => {
    try {
        console.log('🧾 Creating new sale...');
        console.log('Request body:', req.body);

        const {
            customerName,
            customerPhone,
            customerEmail,
            tableNumber,
            items,
            paymentMethod,
            paymentStatus,
            orderStatus,
            orderType,
            notes,
            staffNotes,
            discountTotal
        } = req.body;

        // Validate items
        if (!items || !items.length) {
            return res.status(400).json({
                success: false,
                message: 'Please add at least one item'
            });
        }

        let subtotal = 0;
        let taxTotal = 0;
        const processedItems = [];

        // Process each item
        for (const item of items) {
            const menuItem = await MenuItem.findById(item.menuItemId);
            if (!menuItem) {
                return res.status(400).json({
                    success: false,
                    message: `Menu item not found`
                });
            }

            if (!menuItem.isActive) {
                return res.status(400).json({
                    success: false,
                    message: `${menuItem.name} is not available`
                });
            }

            const quantity = item.quantity || 1;
            const unitPrice = menuItem.price;
            const itemSubtotal = unitPrice * quantity;

            // Calculate tax
            let itemTax = 0;
            if (menuItem.tax > 0) {
                if (menuItem.taxType === 'percentage') {
                    itemTax = (itemSubtotal * menuItem.tax) / 100;
                } else {
                    itemTax = menuItem.tax * quantity;
                }
            }

            const itemDiscount = item.discount || 0;
            const itemTotal = itemSubtotal + itemTax - itemDiscount;

            subtotal += itemSubtotal;
            taxTotal += itemTax;

            processedItems.push({
                menuItemId: menuItem._id,
                name: menuItem.name,
                category: menuItem.category,
                quantity,
                unitPrice,
                tax: menuItem.tax,
                taxType: menuItem.taxType,
                discount: itemDiscount,
                subtotal: itemSubtotal,
                total: itemTotal,
                notes: item.notes || ''
            });

            // Update inventory if tracked
            if (menuItem.trackInventory && menuItem.stockQuantity > 0) {
                menuItem.stockQuantity -= quantity;
                await menuItem.save();
            }
        }

        const totalDiscount = discountTotal || 0;
        const totalAmount = subtotal + taxTotal - totalDiscount;

        // Create sale object - REMOVED saleNumber (let pre-save hook handle it)
        const saleData = {
            customerName: customerName || 'Guest',
            customerPhone,
            customerEmail,
            tableNumber,
            items: processedItems,
            subtotal,
            taxTotal,
            discountTotal: totalDiscount,
            totalAmount,
            paymentMethod: paymentMethod || 'cash',
            paymentStatus: paymentStatus || 'pending',
            orderStatus: orderStatus || 'pending',
            orderType: orderType || 'dine_in',
            notes,
            staffNotes,
            servedBy: req.user._id,
            createdBy: req.user._id
        };

        console.log('📦 Sale data:', saleData);

        // Create and save sale
        const sale = new Sale(saleData);
        await sale.save();

        console.log('✅ Sale created successfully:', sale.saleNumber);

        // Populate and return
        const populatedSale = await Sale.findById(sale._id)
            .populate('createdBy', 'name')
            .populate('servedBy', 'name')
            .populate('items.menuItemId')
            .lean();

        res.status(201).json({
            success: true,
            message: 'Sale created successfully',
            sale: populatedSale
        });

    } catch (error) {
        console.error('❌ Create sale error:', error);

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }

        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Duplicate sale number. Please try again.'
            });
        }

        res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

// @desc    Update sale
// @route   PUT /api/restaurant/sales/:id
// @access  Private/Admin, Restaurant Staff
exports.updateSale = async (req, res) => {
    try {
        const {
            customerName,
            customerPhone,
            customerEmail,
            tableNumber,
            paymentStatus,
            orderStatus,
            notes,
            staffNotes
        } = req.body;

        const sale = await Sale.findById(req.params.id);

        if (!sale) {
            return res.status(404).json({
                success: false,
                message: 'Sale not found'
            });
        }

        // Update fields
        if (customerName) sale.customerName = customerName;
        if (customerPhone !== undefined) sale.customerPhone = customerPhone;
        if (customerEmail !== undefined) sale.customerEmail = customerEmail;
        if (tableNumber !== undefined) sale.tableNumber = tableNumber;
        if (paymentStatus) sale.paymentStatus = paymentStatus;
        if (orderStatus) sale.orderStatus = orderStatus;
        if (notes !== undefined) sale.notes = notes;
        if (staffNotes !== undefined) sale.staffNotes = staffNotes;

        await sale.save();

        const updatedSale = await Sale.findById(sale._id)
            .populate('createdBy', 'name')
            .populate('servedBy', 'name')
            .populate('items.menuItemId')
            .lean();

        res.status(200).json({
            success: true,
            message: 'Sale updated successfully',
            sale: updatedSale
        });

    } catch (error) {
        console.error('Update sale error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Sale not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Delete sale
// @route   DELETE /api/restaurant/sales/:id
// @access  Private/Admin
exports.deleteSale = async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id);

        if (!sale) {
            return res.status(404).json({
                success: false,
                message: 'Sale not found'
            });
        }

        // If items were tracked in inventory, restore stock
        if (sale.items && sale.items.length > 0) {
            for (const item of sale.items) {
                const menuItem = await MenuItem.findById(item.menuItemId);
                if (menuItem && menuItem.trackInventory) {
                    menuItem.stockQuantity += item.quantity;
                    await menuItem.save();
                }
            }
        }

        await sale.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Sale deleted successfully'
        });

    } catch (error) {
        console.error('Delete sale error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Sale not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update payment status
// @route   PUT /api/restaurant/sales/:id/payment-status
// @access  Private/Admin, Restaurant Staff
// @desc    Update payment status
// @route   PUT /api/restaurant/sales/:id/payment-status
// @access  Private/Admin, Restaurant Staff
exports.updatePaymentStatus = async (req, res) => {
    try {
        const { paymentStatus } = req.body;

        if (!paymentStatus || !['pending', 'confirmed', 'cancelled', 'refunded'].includes(paymentStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment status'
            });
        }

        const sale = await Sale.findById(req.params.id);

        if (!sale) {
            return res.status(404).json({
                success: false,
                message: 'Sale not found'
            });
        }

        sale.paymentStatus = paymentStatus;
        await sale.save();

        const updatedSale = await Sale.findById(sale._id)
            .populate('createdBy', 'name')
            .populate('servedBy', 'name')
            .lean();

        res.status(200).json({
            success: true,
            message: 'Payment status updated successfully',
            sale: updatedSale
        });

    } catch (error) {
        console.error('Update payment status error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Sale not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};
// @desc    Update order status
// @route   PUT /api/restaurant/sales/:id/order-status
// @access  Private/Admin, Restaurant Staff
exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderStatus } = req.body;

        if (!orderStatus || !['pending', 'preparing', 'ready', 'served', 'cancelled'].includes(orderStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order status'
            });
        }

        const sale = await Sale.findById(req.params.id);

        if (!sale) {
            return res.status(404).json({
                success: false,
                message: 'Sale not found'
            });
        }

        sale.orderStatus = orderStatus;
        await sale.save();

        const updatedSale = await Sale.findById(sale._id)
            .populate('createdBy', 'name')
            .populate('servedBy', 'name')
            .lean();

        res.status(200).json({
            success: true,
            message: 'Order status updated successfully',
            sale: updatedSale
        });

    } catch (error) {
        console.error('Update order status error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Sale not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

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