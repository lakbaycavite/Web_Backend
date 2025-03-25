const mongoose = require('mongoose')

const Schema = mongoose.Schema

const eventSchema = new Schema({
    start: {
        type: Date,
        required: false,
    },
    end: {
        type: Date,
        required: false,
    },
    title: {
        type: String,
        required: false,
    },
    description: {
        type: String,
        required: false,
    },
    image: {
        type: String,
        required: false,
    },
    place: {
        type: String,
        required: false,
    },
    barangay: {
        type: String,
        required: false,
    },
    color: {
        type: String,
        required: false,
    },
    isActive: {
        type: Boolean,
        required: false,
        default: true,
    }
}, { timestamps: true })

module.exports = mongoose.model('Event', eventSchema);