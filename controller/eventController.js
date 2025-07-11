const Event = require('../models/eventModel')
const mongoose = require('mongoose')
const cloudinary = require('../configs/cloudinaryConfig')
const streamifier = require('streamifier')
const axios = require('axios')
const User = require('../models/userModel')

// get all event
// const getEvents = async (req, res) => {
//     const events = await Event.find({}).sort({ createdAt: -1 })
//     return res.status(200).json(events)
// }

const getEvents = async (req, res) => {
    try {
        // Extract date range parameters
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
        const status = req.query.status || 'all'; // 'all', 'active', or 'inactive'

        // Build query filter
        let filter = {};

        // Add date range filter if dates are provided
        if (startDate && endDate) {
            filter.start = {
                $gte: startDate,
                $lte: endDate
            };
        }
        // If only start date is provided
        else if (startDate) {
            filter.start = { $gte: startDate };
        }
        // If only end date is provided
        else if (endDate) {
            filter.start = { $lte: endDate };
        }

        // Add status filter if specified
        if (status === 'active') {
            filter.isActive = true;
        } else if (status === 'inactive') {
            filter.isActive = false;
        }

        // Get events with filters
        const events = await Event.find(filter).sort({ start: -1 });

        // Count active and inactive events
        const totalActive = await Event.countDocuments({ ...filter, isActive: true });
        const totalInactive = await Event.countDocuments({ ...filter, isActive: false });

        const adminUser = await User.findOne({ role: 'admin' });

        res.status(200).json({
            events,
            adminUser
        })
    } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json({ error: error.message });
    }
};

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


// const createEvent = async (req, res) => {
//     try {
//         const { start, end, title, description, color, place, barangay } = req.body;
//         // const filePath = req.file ? req.file.filename : null

//         if (!start || !end || !title || !description) {
//             return res.status(400).json({ error: "All fields (start, end, title, description) are required." });
//         }

//         // check if the title already exists
//         const titleExists = await Event.findOne({ title });
//         if (titleExists) {
//             return res.status(400).json({ error: "Event title already exists." });
//         }

//         let eventImage;
//         if (req.file) {
//             try {
//                 const result = await new Promise((resolve, reject) => {
//                     const stream = cloudinary.uploader.upload_stream(
//                         { folder: 'lakbaycavite/events' },
//                         (error, result) => {
//                             if (error) {
//                                 console.error("Cloudinary upload error:", error);
//                                 reject(error);
//                             } else {
//                                 resolve(result);
//                             }
//                         }
//                     );

//                     // Make sure the buffer exists before piping
//                     if (!req.file.buffer) {
//                         throw new Error('File buffer is not available');
//                     }

//                     streamifier.createReadStream(req.file.buffer).pipe(stream);
//                 });

//                 eventImage = result.secure_url;
//             } catch (error) {
//                 console.error('Error uploading to Cloudinary:', error);
//                 // Handle the error appropriately, e.g.:
//                 // return res.status(500).json({ error: 'Failed to upload image' });
//             }
//         }

//         const startDate = new Date(start);
//         const endDate = new Date(end);
//         const now = new Date();

//         if (startDate < now) {
//             return res.status(400).json({ error: "Start time cannot be in the past." });
//         }

//         if (endDate <= startDate) {
//             return res.status(400).json({ error: "End time must be after the start time." });
//         }

//         const event = await Event.create({ start, end, title, description, image: eventImage, place, barangay, color });

//         return res.status(201).json(event);
//     } catch (error) {
//         console.error("Error creating event:", error);
//         return res.status(500).json({ error: "Internal server error" });
//     }
// };

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

    const isTitleExisting = await Event.findOne({ title })

    if (isTitleExisting && isTitleExisting._id.toString() !== id) {
        return res.status(400).json({ error: "Event title already exists." });
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



const createEvent = async (req, res) => {
    try {
        const { start, end, title, description, color, place, barangay } = req.body;

        if (!start || !end || !title || !description) {
            return res.status(400).json({ error: "All fields (start, end, title, description) are required." });
        }

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
                            if (error) reject(error);
                            else resolve(result);
                        }
                    );

                    if (!req.file.buffer) {
                        throw new Error('File buffer is not available');
                    }

                    streamifier.createReadStream(req.file.buffer).pipe(stream);
                });

                eventImage = result.secure_url;
            } catch (error) {
                console.error('❌ Cloudinary error:', error);
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

        // 🔔 OneSignal Push Notification
        console.log("📡 Attempting to send OneSignal push...");
        const pushResponse = await axios.post(
            'https://onesignal.com/api/v1/notifications',
            {
                app_id: '4c4d11ae-aa91-4e6d-828b-64127ade6bb9',
                include_player_ids: ['7d301c8d-3f9e-432e-90c6-2015bd4a55e2'],
                headings: {
                    en: `New Event: ${title || 'Untitled Event'}`
                },
                contents: {
                    en: `Happening in ${barangay || 'an unknown location'} on ${start ? new Date(start).toDateString() : 'unknown date'}`
                },
                data: {
                    event_id: event._id.toString(),
                    barangay: barangay || '',
                    title: title || '',
                    start: start || '',
                }
            },
            {
                headers: {
                    Authorization: 'Basic os_v2_app_jrgrdlvksfhg3aulmqjhvxtlxfmxvagjp5suoh5qmrqqk2pfbmyflkwjyraq575ofds5qrcylbau33tw44unvq445tqpbcuvv3eq2gi',
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log("✅ Push sent:", pushResponse.data);

        return res.status(201).json(event);
    } catch (error) {
        console.error("❌ Error creating event or sending push:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

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