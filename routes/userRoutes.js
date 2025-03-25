const express = require('express')
const User = require('../models/userModel')
const {
    getUser,
    getUsers,
    createUser,
    deleteUser,
    updateUser,
    uploadImage,
    images,
    loginUser,
    toggleUserStatus,
    initiateUserRegistration,
    verifyAndCreateUser,
    requestPasswordReset,
    resetPassword
} = require('../controller/userController')
const { upload } = require('../middleware/fileUpload')


const router = express.Router()

router.get('/image', images)

// show all user
router.get('/', getUsers)

// get single user
router.get('/:id', getUser)

// create a user
// router.post('/', createUser)

// update a user
router.put('/update/:id', updateUser)

// delete a user
router.delete('/delete', deleteUser)

// image upload
router.post('/upload-image', upload.single('image'), uploadImage);

// toggle status
router.put('/toggle-status/:id', toggleUserStatus)

// user login
router.post('/login', loginUser)


// Route to initiate registration and send verification code
router.post('/register', initiateUserRegistration);

// Route to verify code and complete registration
router.post('/verify', verifyAndCreateUser);

// Route to initiate password reset
router.post('/request-reset', requestPasswordReset)

router.post('/reset', resetPassword)



module.exports = router