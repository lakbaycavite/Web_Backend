const Event = require('../models/eventModel')
const mongoose = require('mongoose')
const cloudinary = require('../configs/cloudinaryConfig')
const streamifier = require('streamifier')

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
        // const filePath = req.file ? req.file.filename : null

        if (!start || !end || !title || !description) {
            return res.status(400).json({ error: "All fields (start, end, title, description) are required." });
        }

        // check if the title already exists
        const titleExists = await Event.findOne({ title });
        if (titleExists) {
            return res.status(400).json({ error: "Event title already exists." });
        }

        let eventImage;
        if (req.file) {
            try {
                const result = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { folder: 'lakbaycavite/events' },
                        (error, result) => {
                            if (error) {
                                console.error("Cloudinary upload error:", error);
                                reject(error);
                            } else {
                                resolve(result);
                            }
                        }
                    );

                    // Make sure the buffer exists before piping
                    if (!req.file.buffer) {
                        throw new Error('File buffer is not available');
                    }

                    streamifier.createReadStream(req.file.buffer).pipe(stream);
                });

                eventImage = result.secure_url;
            } catch (error) {
                console.error('Error uploading to Cloudinary:', error);
                // Handle the error appropriately, e.g.:
                // return res.status(500).json({ error: 'Failed to upload image' });
            }
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

        const event = await Event.create({ start, end, title, description, image: eventImage, place, barangay, color });

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

    const isTitleExisting = await Event.findOne({ title })

    if (isTitleExisting && isTitleExisting._id.toString() !== id) {
        return res.status(400).json({ error: "Event title already exists." });
    }

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

        let imageUpload;
        if (req.file) {
            try {
                const result = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { folder: 'lakbaycavite/posts' },
                        (error, result) => {
                            if (error) {
                                console.error("Cloudinary upload error:", error);
                                reject(error);
                            } else {
                                resolve(result);
                            }
                        }
                    );

                    // Make sure the buffer exists before piping
                    if (!req.file.buffer) {
                        throw new Error('File buffer is not available');
                    }

                    streamifier.createReadStream(req.file.buffer).pipe(stream);
                });

                imageUpload = result.secure_url;
            } catch (error) {
                console.error('Error uploading to Cloudinary:', error);
                // Handle the error appropriately, e.g.:
                // return res.status(500).json({ error: 'Failed to upload image' });
            }
        }

        event.image = imageUpload;
        await event.save();

        return res.status(200).json({
            message: 'Image uploaded successfully',
            image: imageUpload
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