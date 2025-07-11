const Hotline = require('../models/hotlineModel')
const mongoose = require('mongoose')
const User = require('../models/userModel')

// create a hotline
const createHotline = async (req, res) => {
    try {
        const { name, number, location, category } = req.body;

        if (!name || !number || !category) {
            return res.status(400).json({ error: "All fields (name, number, category) are required." });
        }

        const hotline = await Hotline.create({ name, number, location, category });

        return res.status(201).json(hotline);
    } catch (error) {
        console.error("Error creating hotline:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// get all hotline
const getHotlines = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const skip = (page - 1) * limit;

    // Build search filter
    let searchFilter = {
        $or: [
            { name: { $regex: search, $options: 'i' } },
            { number: { $regex: search, $options: 'i' } },
            { location: { $regex: search, $options: 'i' } },
            { category: { $regex: search, $options: 'i' } }
        ]
    };

    // Add category filter if provided
    if (category && category !== 'All Categories') {
        searchFilter.category = category;
    }

    // Get total count and filtered hotlines
    const total = await Hotline.countDocuments(searchFilter);
    const hotlines = await Hotline.find(searchFilter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });  // Sort latest first

    // Get category counts for statistics
    const categoryCounts = {
        'Fire': await Hotline.countDocuments({ ...searchFilter, category: 'Fire' }),
        'Police': await Hotline.countDocuments({ ...searchFilter, category: 'Police' }),
        'Ambulance/ Medical': await Hotline.countDocuments({ ...searchFilter, category: 'Ambulance/ Medical' }),
        'Disaster Response': await Hotline.countDocuments({ ...searchFilter, category: 'Disaster Response' }),
        'Others': await Hotline.countDocuments({
            ...searchFilter,
            category: {
                $nin: ['Fire', 'Police', 'Ambulance/ Medical', 'Disaster Response']
            }
        })
    };

    const adminUser = await User.findOne({ role: 'admin' });

    return res.status(200).json({
        hotlines,
        total,
        page,
        pages: Math.ceil(total / limit),
        categoryCounts,
        adminUser
    });
};

// get a single hotline
const getHotline = async (req, res) => {
    const { id } = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'No such hotline' })
    }


    const hotline = await Hotline.findById(id)

    if (!hotline) {
        return res.status(404).json({ error: 'No such hotline' })
    }

    res.status(200).json(hotline)
}

// update a hotline
const updateHotline = async (req, res) => {
    const { id } = req.params
    const { name, number, location, category } = req.body

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'No such hotline' })
    }

    const hotline = await Hotline.findById(id)

    if (!hotline) {
        return res.status(404).json({ error: 'No such hotline' })
    }

    const updatedHotline = await Hotline.findByIdAndUpdate(id, { name, number, location, category }, { new: true })

    return res.status(200).json(updatedHotline)
}

// delete a hotline
const deleteHotline = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedHotline = await Hotline.findByIdAndDelete({ _id: id });

        if (!deletedHotline) {
            return res.status(404).json({ message: "Hotline not found" });
        }

        res.status(200).json({
            message: "Hotline deleted successfully",
            deletedHotline
        });

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
}

module.exports = {
    createHotline,
    getHotlines,
    getHotline,
    updateHotline,
    deleteHotline,
}
