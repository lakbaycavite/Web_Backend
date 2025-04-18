const express = require('express')
const { createFeedback, getFeedbacks, getFeedback, updateFeedback, toggleFeedbackStatus } = require('../controller/feedbackController')
const requireAuth = require('../middleware/requireAuth')


const router = express.Router()

router.post('/', requireAuth, createFeedback)
router.get('/', requireAuth, getFeedbacks)
router.get('/:id', requireAuth, getFeedback)
router.put('/toggle-status/:id', requireAuth, toggleFeedbackStatus)
router.put('/update/:id', requireAuth, updateFeedback)

module.exports = router