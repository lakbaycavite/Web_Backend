const mongoose = require('mongoose')

const Schema = mongoose.Schema

const commentSchema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        required: true,
    },
}, { timestamps: true })

const postSchema = new Schema({
    content: {
        type: String,
        required: false,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false,
    },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    attachments: [{ type: String }],
    comments: [commentSchema],
    is_hidden: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true })

module.exports = mongoose.model('Post', postSchema);