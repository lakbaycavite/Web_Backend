const express = require('express')
const Event = require('../models/eventModel')
const { upload } = require('../middleware/fileUpload')
const {
    getEvent,
    getEvents,
    createEvent,
    deleteEvent,
    updateEvent,
    uploadImage,
    deleteImage,
    toggleEventStatus
} = require('../controller/eventController')

// const requireAuth = require('../middleware/requireAuth')

const router = express.Router()

// router.use(requireAuth)

// show all events
router.get('/', getEvents)

// get a single event
router.get('/:id', getEvent)

// create an event
router.post('/', upload.single('image'), createEvent)

// update an event
router.put('/update/:id', upload.single('image'), updateEvent)

// Delete an event
router.delete('/delete/:id', deleteEvent)

// router.post('/upload', upload.single('image'), uploadImage);
router.post('/upload/:id', upload.single('image'), uploadImage)

router.delete('/delete-image/:id', deleteImage)

router.post('/toggle-status/:id', toggleEventStatus)


module.exports = router