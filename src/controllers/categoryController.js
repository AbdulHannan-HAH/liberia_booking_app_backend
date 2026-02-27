const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');

// @desc    Get all categories
// @route   GET /api/restaurant/categories
// @access  Private/Admin, Restaurant Staff
exports.getCategories = async (req, res) => {
    try {
        const { isActive, search } = req.query;

        const query = {};
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        if (search) {
            query.$text = { $search: search };
        }

        const categories = await Category.find(query)
            .sort({ sortOrder: 1, displayName: 1 })
            .populate('createdBy', 'name')
            .populate('updatedBy', 'name')
            .lean();

        // Get item count for each category
        const categoriesWithCount = await Promise.all(
            categories.map(async (category) => {
                const itemCount = await MenuItem.countDocuments({
                    category: category.name,
                    isActive: true
                });
                return {
                    ...category,
                    itemCount
                };
            })
        );

        res.status(200).json({
            success: true,
            count: categories.length,
            categories: categoriesWithCount
        });

    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get single category
// @route   GET /api/restaurant/categories/:id
// @access  Private/Admin, Restaurant Staff
exports.getCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id)
            .populate('createdBy', 'name')
            .populate('updatedBy', 'name')
            .lean();

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        const itemCount = await MenuItem.countDocuments({
            category: category.name,
            isActive: true
        });

        res.status(200).json({
            success: true,
            category: {
                ...category,
                itemCount
            }
        });

    } catch (error) {
        console.error('Get category error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Create category
// @route   POST /api/restaurant/categories
// @access  Private/Admin
exports.createCategory = async (req, res) => {
    try {
        console.log('📁 Creating new category...');
        console.log('Request body:', req.body);

        const { name, displayName, icon, description, sortOrder } = req.body;

        // Validate required fields
        if (!name || !displayName) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name and display name'
            });
        }

        // Check if category already exists
        const existingCategory = await Category.findOne({
            $or: [
                { name: name.toLowerCase().replace(/\s+/g, '_') },
                { displayName: { $regex: new RegExp(`^${displayName}$`, 'i') } }
            ]
        });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: 'Category with this name already exists'
            });
        }

        // Format name: lowercase, underscores instead of spaces
        const formattedName = name.toLowerCase().replace(/\s+/g, '_');

        // Create category
        const category = await Category.create({
            name: formattedName,
            displayName,
            icon: icon || 'coffee',
            description: description || '',
            sortOrder: sortOrder || 0,
            createdBy: req.user._id,
            updatedBy: req.user._id
        });

        console.log('✅ Category created:', category.displayName);

        const populatedCategory = await Category.findById(category._id)
            .populate('createdBy', 'name')
            .populate('updatedBy', 'name')
            .lean();

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            category: populatedCategory
        });

    } catch (error) {
        console.error('Create category error:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Category with this name already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update category
// @route   PUT /api/restaurant/categories/:id
// @access  Private/Admin
exports.updateCategory = async (req, res) => {
    try {
        const { displayName, icon, description, isActive, sortOrder } = req.body;

        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Update fields
        if (displayName) category.displayName = displayName;
        if (icon) category.icon = icon;
        if (description !== undefined) category.description = description;
        if (isActive !== undefined) category.isActive = isActive;
        if (sortOrder !== undefined) category.sortOrder = sortOrder;

        category.updatedBy = req.user._id;

        await category.save();

        // If category name changed, update all menu items with this category
        if (displayName && displayName !== category.displayName) {
            await MenuItem.updateMany(
                { category: category.name },
                { $set: { categoryDisplay: displayName } }
            );
        }

        const updatedCategory = await Category.findById(category._id)
            .populate('createdBy', 'name')
            .populate('updatedBy', 'name')
            .lean();

        res.status(200).json({
            success: true,
            message: 'Category updated successfully',
            category: updatedCategory
        });

    } catch (error) {
        console.error('Update category error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Delete category
// @route   DELETE /api/restaurant/categories/:id
// @access  Private/Admin
exports.deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Check if category has menu items
        const itemCount = await MenuItem.countDocuments({ category: category.name });

        if (itemCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category that has ${itemCount} menu items. Please reassign or delete the items first.`
            });
        }

        await category.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Category deleted successfully'
        });

    } catch (error) {
        console.error('Delete category error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Initialize default categories
// @route   POST /api/restaurant/categories/initialize
// @access  Private/Admin
exports.initializeCategories = async (req, res) => {
    try {
        const defaultCategories = [
            { name: 'cold_drink', displayName: 'Cold Drinks', icon: 'coffee', sortOrder: 10 },
            { name: 'soft_drink', displayName: 'Soft Drinks', icon: 'coffee', sortOrder: 20 },
            { name: 'beer', displayName: 'Beer', icon: 'beer', sortOrder: 30 },
            { name: 'wine', displayName: 'Wine', icon: 'wine', sortOrder: 40 },
            { name: 'spirits', displayName: 'Spirits', icon: 'cocktail', sortOrder: 50 },
            { name: 'cocktails', displayName: 'Cocktails', icon: 'cocktail', sortOrder: 60 },
            { name: 'snacks', displayName: 'Snacks', icon: 'utensils', sortOrder: 70 },
            { name: 'meals', displayName: 'Meals', icon: 'utensils', sortOrder: 80 },
            { name: 'desserts', displayName: 'Desserts', icon: 'cake', sortOrder: 90 },
            { name: 'pizza', displayName: 'Pizza', icon: 'pizza', sortOrder: 100 },
            { name: 'burger', displayName: 'Burgers', icon: 'burger', sortOrder: 110 },
            { name: 'salad', displayName: 'Salads', icon: 'salad', sortOrder: 120 },
            { name: 'ice_cream', displayName: 'Ice Cream', icon: 'ice-cream', sortOrder: 130 }
        ];

        for (const cat of defaultCategories) {
            await Category.findOneAndUpdate(
                { name: cat.name },
                {
                    ...cat,
                    createdBy: req.user._id,
                    updatedBy: req.user._id
                },
                { upsert: true, new: true }
            );
        }

        res.status(200).json({
            success: true,
            message: 'Default categories initialized successfully'
        });

    } catch (error) {
        console.error('Initialize categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};