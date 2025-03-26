const express = require('express')
const Post = require('../models/postModel')
const {
        createPost,
        getPosts,
        getPost,
        deletePost,
        updatePost,
        togglePostVisibility,
        addComment,
        deleteComment,
        getComments
} = require('../controller/postController')
const User = require('../models/userModel')
const requireAuth = require('../middleware/requireAuth')
const { upload } = require('../middleware/fileUpload')

const router = express.Router()

router.use(requireAuth)

// Show all post
router.get('/', getPosts)

// Get a single post
router.get('/:id', getPost)

// Create a post
// router.post('/', upload.single('imageURL'), createPost)

// Update a post
// router.put('/update/:id', updatePost)

// Delete a post
router.delete('/delete/:id', deletePost)

//
router.put('/toggle-visibility/:id', togglePostVisibility)

router.post('/:id/comments', addComment)
router.get('/:id/comments', getComments)
router.delete('/:postId/comments/:commentId', deleteComment)

module.exports = router