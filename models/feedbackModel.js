const mongoose = require('mongoose')

const feedbackSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: true,
        minlength: 10,
        maxlength: 1000
    },
    category: {
        type: String,
        enum: ['UI/UX', 'Performance', 'Features', 'Bug', 'Content', 'Other/All'],
        required: true
    },
    adminResponse: {
        type: String,
        default: null
    },
    isPublic: {
        type: Boolean,
        default: true
    }
}, { timestamps: true })

module.exports = mongoose.model('Feedback', feedbackSchema)