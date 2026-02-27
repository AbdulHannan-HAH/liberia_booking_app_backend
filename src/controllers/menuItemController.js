const MenuItem = require('../models/MenuItem');

// @desc    Get all menu items
// @route   GET /api/restaurant/menu-items
// @access  Private/Admin, Restaurant Staff
exports.getMenuItems = async (req, res) => {
    try {
        const {
            category,
            isActive,
            isPopular,
            search,
            page = 1,
            limit = 50,
            sortBy = 'name',
            sortOrder = 'asc'
        } = req.query;

        const query = {};

        if (category) query.category = category;
        if (isActive !== undefined) query.isActive = isActive === 'true';
        if (isPopular !== undefined) query.isPopular = isPopular === 'true';

        if (search) {
            query.$text = { $search: search };
        }

        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const menuItems = await MenuItem.find(query)
            .sort(sort)
            .limit(parseInt(limit))
            .skip(skip)
            .populate('createdBy', 'name')
            .populate('updatedBy', 'name')
            .lean();

        const total = await MenuItem.countDocuments(query);

        // Get categories from Category model instead of aggregating from menu items
        const Category = require('../models/Category');
        const categories = await Category.find({ isActive: true })
            .sort({ sortOrder: 1, displayName: 1 })
            .select('name displayName icon')
            .lean();

        // Add count of active menu items for each category
        const categoriesWithCount = await Promise.all(
            categories.map(async (cat) => {
                const count = await MenuItem.countDocuments({
                    category: cat.name,
                    isActive: true
                });
                return {
                    _id: cat.name,
                    categoryDisplay: cat.displayName,
                    icon: cat.icon,
                    count
                };
            })
        );

        res.status(200).json({
            success: true,
            count: menuItems.length,
            total,
            totalPages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page),
            menuItems,
            categories: categoriesWithCount
        });

    } catch (error) {
        console.error('Get menu items error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};
// @desc    Get single menu item
// @route   GET /api/restaurant/menu-items/:id
// @access  Private/Admin, Restaurant Staff
exports.getMenuItem = async (req, res) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id)
            .populate('createdBy', 'name')
            .populate('updatedBy', 'name')
            .lean();

        if (!menuItem) {
            return res.status(404).json({
                success: false,
                message: 'Menu item not found'
            });
        }

        res.status(200).json({
            success: true,
            menuItem
        });

    } catch (error) {
        console.error('Get menu item error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Menu item not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Create menu item
// @route   POST /api/restaurant/menu-items
// @access  Private/Admin
exports.createMenuItem = async (req, res) => {
    try {
        console.log('🍽️ Creating new menu item...');
        console.log('Request body:', req.body);

        const {
            name,
            category,
            categoryDisplay,
            price,
            cost,
            tax,
            taxType,
            description,
            unit,
            stockQuantity,
            trackInventory,
            isPopular,
            image
        } = req.body;

        // Validate required fields
        if (!name || !category || !categoryDisplay || !price) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Create menu item
        const menuItem = await MenuItem.create({
            name,
            category,
            categoryDisplay,
            price,
            cost: cost || 0,
            tax: tax || 0,
            taxType: taxType || 'percentage',
            description: description || '',
            unit: unit || 'piece',
            stockQuantity: stockQuantity || 0,
            trackInventory: trackInventory || false,
            isPopular: isPopular || false,
            image: image || null,
            createdBy: req.user._id,
            updatedBy: req.user._id
        });

        console.log('✅ Menu item created:', menuItem.name);

        const populatedItem = await MenuItem.findById(menuItem._id)
            .populate('createdBy', 'name')
            .populate('updatedBy', 'name')
            .lean();

        res.status(201).json({
            success: true,
            message: 'Menu item created successfully',
            menuItem: populatedItem
        });

    } catch (error) {
        console.error('Create menu item error:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update menu item
// @route   PUT /api/restaurant/menu-items/:id
// @access  Private/Admin
exports.updateMenuItem = async (req, res) => {
    try {
        const {
            name,
            category,
            categoryDisplay,
            price,
            cost,
            tax,
            taxType,
            description,
            unit,
            stockQuantity,
            trackInventory,
            isActive,
            isPopular,
            image
        } = req.body;

        const menuItem = await MenuItem.findById(req.params.id);

        if (!menuItem) {
            return res.status(404).json({
                success: false,
                message: 'Menu item not found'
            });
        }

        // Update fields
        if (name) menuItem.name = name;
        if (category) menuItem.category = category;
        if (categoryDisplay) menuItem.categoryDisplay = categoryDisplay;
        if (price !== undefined) menuItem.price = price;
        if (cost !== undefined) menuItem.cost = cost;
        if (tax !== undefined) menuItem.tax = tax;
        if (taxType) menuItem.taxType = taxType;
        if (description !== undefined) menuItem.description = description;
        if (unit) menuItem.unit = unit;
        if (stockQuantity !== undefined) menuItem.stockQuantity = stockQuantity;
        if (trackInventory !== undefined) menuItem.trackInventory = trackInventory;
        if (isActive !== undefined) menuItem.isActive = isActive;
        if (isPopular !== undefined) menuItem.isPopular = isPopular;
        if (image !== undefined) menuItem.image = image;

        menuItem.updatedBy = req.user._id;

        await menuItem.save();

        const updatedItem = await MenuItem.findById(menuItem._id)
            .populate('createdBy', 'name')
            .populate('updatedBy', 'name')
            .lean();

        res.status(200).json({
            success: true,
            message: 'Menu item updated successfully',
            menuItem: updatedItem
        });

    } catch (error) {
        console.error('Update menu item error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Menu item not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Delete menu item
// @route   DELETE /api/restaurant/menu-items/:id
// @access  Private/Admin
exports.deleteMenuItem = async (req, res) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id);

        if (!menuItem) {
            return res.status(404).json({
                success: false,
                message: 'Menu item not found'
            });
        }

        await menuItem.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Menu item deleted successfully'
        });

    } catch (error) {
        console.error('Delete menu item error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Menu item not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Initialize default menu items
// @route   POST /api/restaurant/menu-items/initialize
// @access  Private/Admin
exports.initializeMenuItems = async (req, res) => {
    try {
        const defaultItems = [
            // Cold Drinks
            {
                name: 'Coca Cola',
                category: 'cold_drink',
                categoryDisplay: 'Cold Drinks',
                price: 2.99,
                cost: 1.50,
                tax: 5,
                taxType: 'percentage',
                description: 'Chilled Coca Cola 330ml',
                unit: 'piece',
                isPopular: true
            },
            {
                name: 'Sprite',
                category: 'cold_drink',
                categoryDisplay: 'Cold Drinks',
                price: 2.99,
                cost: 1.50,
                tax: 5,
                taxType: 'percentage',
                description: 'Chilled Sprite 330ml',
                unit: 'piece',
                isPopular: true
            },
            {
                name: 'Mineral Water',
                category: 'cold_drink',
                categoryDisplay: 'Cold Drinks',
                price: 1.99,
                cost: 0.80,
                tax: 5,
                taxType: 'percentage',
                description: '1L Mineral Water',
                unit: 'piece',
                isPopular: true
            },
            // Soft Drinks
            {
                name: 'Fresh Lime Soda',
                category: 'soft_drink',
                categoryDisplay: 'Soft Drinks',
                price: 3.99,
                cost: 2.00,
                tax: 5,
                taxType: 'percentage',
                description: 'Fresh lime with soda',
                unit: 'glass',
                isPopular: true
            },
            {
                name: 'Mango Shake',
                category: 'soft_drink',
                categoryDisplay: 'Soft Drinks',
                price: 5.99,
                cost: 3.50,
                tax: 5,
                taxType: 'percentage',
                description: 'Fresh mango milkshake',
                unit: 'glass',
                isPopular: false
            },
            // Beers
            {
                name: 'Kingfisher',
                category: 'beer',
                categoryDisplay: 'Beer',
                price: 4.99,
                cost: 3.00,
                tax: 18,
                taxType: 'percentage',
                description: 'Kingfisher Premium 650ml',
                unit: 'bottle',
                isPopular: true
            },
            {
                name: 'Bira 91',
                category: 'beer',
                categoryDisplay: 'Beer',
                price: 5.99,
                cost: 3.50,
                tax: 18,
                taxType: 'percentage',
                description: 'Bira 91 White 650ml',
                unit: 'bottle',
                isPopular: true
            },
            {
                name: 'Heineken',
                category: 'beer',
                categoryDisplay: 'Beer',
                price: 6.99,
                cost: 4.00,
                tax: 18,
                taxType: 'percentage',
                description: 'Heineken 650ml',
                unit: 'bottle',
                isPopular: false
            },
            // Wine
            {
                name: 'Red Wine',
                category: 'wine',
                categoryDisplay: 'Wine',
                price: 24.99,
                cost: 15.00,
                tax: 18,
                taxType: 'percentage',
                description: 'Premium Red Wine (750ml)',
                unit: 'bottle',
                isPopular: false
            },
            // Snacks
            {
                name: 'French Fries',
                category: 'snacks',
                categoryDisplay: 'Snacks',
                price: 4.99,
                cost: 2.00,
                tax: 5,
                taxType: 'percentage',
                description: 'Crispy french fries with dip',
                unit: 'plate',
                isPopular: true
            },
            {
                name: 'Chicken Wings',
                category: 'snacks',
                categoryDisplay: 'Snacks',
                price: 8.99,
                cost: 4.50,
                tax: 5,
                taxType: 'percentage',
                description: 'Spicy chicken wings (6 pcs)',
                unit: 'plate',
                isPopular: true
            }
        ];

        for (const item of defaultItems) {
            await MenuItem.findOneAndUpdate(
                { name: item.name, category: item.category },
                { ...item, createdBy: req.user._id, updatedBy: req.user._id },
                { upsert: true, new: true }
            );
        }

        res.status(200).json({
            success: true,
            message: 'Default menu items initialized successfully'
        });

    } catch (error) {
        console.error('Initialize menu items error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};