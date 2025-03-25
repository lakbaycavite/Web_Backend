const Event = require('../models/eventModel')
const mongoose = require('mongoose')

// get all event
const getEvents = async (req, res) => {
    const events = await Event.find({}).sort({ createdAt: -1 })
    return res.status(200).json(events)
}

// get a single event
const getEvent = async (req, res) => {
    const { id } = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'No such event' })
    }


    const event = await Event.findById(id)

    if (!event) {
        return res.status(404).json({ error: 'No such event' })
    }

    res.status(200).json(event)
}


const createEvent = async (req, res) => {
    try {
        const { start, end, title, description, color, place, barangay } = req.body;
        const filePath = req.file ? req.file.filename : null

        if (!start || !end || !title || !description) {
            return res.status(400).json({ error: "All fields (start, end, title, description) are required." });
        }


        const startDate = new Date(start);
        const endDate = new Date(end);
        const now = new Date();

        if (startDate < now) {
            return res.status(400).json({ error: "Start time cannot be in the past." });
        }

        if (endDate <= startDate) {
            return res.status(400).json({ error: "End time must be after the start time." });
        }

        const event = await Event.create({ start, end, title, description, image: filePath, place, barangay, color });

        return res.status(201).json(event);
    } catch (error) {
        console.error("Error creating event:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// delete an event
const deleteEvent = async (req, res) => {
    const { id } = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'No such event' })
    }

    const event = await Event.findOneAndDelete({ _id: id })

    if (!event) {
        return res.status(404).json({ error: 'No such event' })
    }

    res.status(200).json(event)

}

// update an event

const updateEvent = async (req, res) => {
    const { id } = req.params
    const { title, description, color, place, barangay, start, end } = req.body

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'No such event' })
    }

    const event = await Event.findOneAndUpdate({ _id: id }, {
        title,
        description,
        place,
        barangay,
        color,
        start,
        end
    })

    if (!event) {
        return res.status(404).json({ error: 'No such event' })
    }

    res.status(200).json(event)
}

const toggleEventStatus = async (req, res) => {
    const { id } = req.params
    const event = await Event.findById(id)
    try {
        if (!event) {
            return res.status(404).json({ error: 'No such event' })
        }

        event.isActive = !event.isActive
        await event.save()

        return res.status(200).json(event)
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" })
    }
}
// upload image

const uploadImage = async (req, res) => {
    try {
        const { id } = req.params;
        const event = await Event.findById(id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        event.image = req.file.filename;
        await event.save();

        return res.status(200).json({
            message: 'Image uploaded successfully',
            image: req.file.filename
        })
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
}

const deleteImage = async (req, res) => {
    try {
        const { id } = req.params;
        const event = await Event.findById(id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        event.image = null;
        await event.save();

        return res.status(200).json({
            message: 'Image deleted successfully',
        })
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
}

module.exports = {
    getEvents,
    getEvent,
    createEvent,
    deleteEvent,
    updateEvent,
    uploadImage,
    deleteImage,
    toggleEventStatus
}