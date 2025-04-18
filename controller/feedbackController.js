const Feedback = require('../models/feedbackModel')
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

        if (rating) filter.rating = rating
        if (category) filter.category = category

        const feedbacks = await Feedback.find(filter).populate('user', 'email username firstName lastName age gender image role').limit(limit * 1).skip((page - 1) * limit).sort({ createdAt: -1 })
        if (!feedbacks) {
            return res.status(404).json({ message: "No feedbacks found" })
        }

        res.status(200).json(feedbacks)
    } catch (error) {
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