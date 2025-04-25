const Feedback = require('../models/feedbackModel')
const User = require('../models/userModel')
const mongoose = require('mongoose')

const createFeedback = async (req, res) => {
    try {
        const { rating, comment, category } = req.body

        const user = req.user._id
        if (!rating || !comment || !category) {
            return res.status(400).json({ message: "All fields are required" })
        }

        if (!user || !mongoose.Types.ObjectId.isValid(user)) {
            return res.status(400).json({ message: "Invalid user ID" })
        }

        const feedback = await Feedback.create({ user, rating, comment, category })

        res.status(201).json(feedback)
    } catch (error) {
        res.status(500).json({ message: "Server error" })
    }
}

const getFeedbacks = async (req, res) => {
    try {
        const { page = 1, limit = 10, rating, category } = req.query
        const filter = {}

        // Apply filters
        if (rating) filter.rating = Number(rating)
        if (category && category !== 'All/Other') filter.category = category

        // Fetch feedbacks with pagination and filters
        const feedbacks = await Feedback.find(filter)
            .populate('user', 'email username firstName lastName age gender image role')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 })

        if (!feedbacks) {
            return res.status(404).json({ message: "No feedbacks found" })
        }

        // Get total count
        const totalCount = await Feedback.countDocuments(filter)

        // Get rating statistics
        const ratingStats = await Feedback.aggregate([
            { $match: filter },
            { $group: { _id: "$rating", count: { $sum: 1 } } }
        ])

        // Format rating stats
        const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        ratingStats.forEach(stat => {
            ratingCounts[stat._id] = stat.count
        })

        // Get category statistics
        const categoryStats = await Feedback.aggregate([
            { $match: filter },
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ])

        // Format category stats
        const categoryCounts = {
            'UI/UX': 0,
            'Performance': 0,
            'Features': 0,
            'Bug': 0,
            'Content': 0,
            'All/Other': 0
        }

        categoryStats.forEach(stat => {
            if (categoryCounts[stat._id] !== undefined) {
                categoryCounts[stat._id] = stat.count
            } else {
                categoryCounts['All/Other'] += stat.count
            }
        })

        // Set headers for pagination
        res.set('X-Total-Count', totalCount);
        res.set('Access-Control-Expose-Headers', 'X-Total-Count');

        const adminUser = await User.findOne({ role: 'admin' })

        // Return data with metadata
        res.status(200).json({
            data: feedbacks,
            total: totalCount,
            page: Number(page),
            pages: Math.ceil(totalCount / limit),
            stats: {
                ratings: ratingCounts,
                categories: categoryCounts
            },
            adminUser
        })
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).json({ message: "Server error" })
    }
}

const getFeedback = async (req, res) => {
    try {
        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ error: 'No such feedback' })
        }

        const feedback = await Feedback.findById(id).populate('user', 'email username first')

        if (!feedback) {
            return res.status(404).json({ error: 'No such feedback' })
        }

        res.status(200).json(feedback)
    } catch (error) {
        res.status(500).json({ message: "Server error" })
    }
}

const updateFeedback = async (req, res) => {
    try {
        const { id } = req.params
        const { adminResponse } = req.body
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ error: 'No such feedback' })
        }

        const feedback = await Feedback.findByIdAndUpdate(id, {
            adminResponse,
        })

        res.status(200).json(feedback)
    } catch (error) {
        res.status(500).json({ message: "Server error" })
    }
}

const toggleFeedbackStatus = async (req, res) => {
    try {
        const { id } = req.params

        const feedback = await Feedback.findById(id)

        if (!feedback) {
            return res.status(404).json({ error: 'No such feedback' })
        }

        feedback.isPublic = !feedback.isPublic

        await feedback.save()
        return res.status(200).json(feedback)

    } catch (error) {
        return res.status(500).json({ error: "Internal server error" })
    }
}


module.exports = {
    createFeedback,
    getFeedbacks,
    getFeedback,
    updateFeedback,
    toggleFeedbackStatus
}