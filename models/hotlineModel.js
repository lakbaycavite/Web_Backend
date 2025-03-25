const mongoose = require('mongoose')

const Schema = mongoose.Schema

const hotlineSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    number: {
        type: String,
        required: true,
    },
    location: {
        type: String,
        required: false,
    },
    category: {
        type: String,
        required: false,
    },
}, { timestamps: true })

module.exports = mongoose.model('Hotline', hotlineSchema);