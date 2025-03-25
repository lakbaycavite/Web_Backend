const mongoose = require('mongoose')
const User = require('../models/userModel')
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const Post = require('../models/postModel')
const { sendVerificationEmail } = require('../configs/emailConfig');
const { sendPasswordResetEmail } = require('../configs/emailConfig');
const Verification = require('../models/verificationModel');
const ResetPassword = require('../models/resetPasswordModel');

require('dotenv').config()

const getUsers = async (req, res) => {

    try {
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 10
        const search = req.query.search || ''
        const skip = (page - 1) * limit

        const searchFilter = {
            $or: [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } }
            ]
        };

        const total = await User.countDocuments()
        const totalActiveUsers = await User.countDocuments({ isActive: true })
        const totalInactiveUsers = await User.countDocuments({ isActive: false })
        const users = await User.find(searchFilter).skip(skip).limit(limit).sort({ createdAt: -1 });

        res.status(200).json({ users, total, totalActiveUsers, totalInactiveUsers, page, pages: Math.ceil(total / limit) })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }

}

const getUser = async (req, res) => {
    const { id } = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'No such user' })
    }

    const user = await User.findById(id)
    const postsCount = await Post.find({ user: id }).countDocuments()
    const commentCountResult = await Post.aggregate([
        { $unwind: "$comments" }, // Flatten the comments array
        { $match: { "comments.user": new mongoose.Types.ObjectId(id) } }, // Filter comments by user ID
        { $count: "totalComments" } // Count the filtered comments
    ]);

    const commentCount = commentCountResult.length > 0 ? commentCountResult[0].totalComments : 0;



    if (!user) {
        return res.status(404).json({ error: 'No such user' })
    }

    res.status(200).json({ user, postsCount, commentCount })
}

// const createUser = async (req, res) => {
//     const { email, username, password, firstName, lastName, age, gender, image, role } = req.body

//     try {

//         const existingUserByEmail = await User.findOne({ email: email });
//         const existingUserByUsername = await User.findOne({ username: username });

//         // Create an array to store error messages
//         let errorMessages = []

//         if (existingUserByEmail) {
//             errorMessages.push('Email is already taken')
//         }

//         if (existingUserByUsername) {
//             errorMessages.push('Username is already taken')
//         }

//         if (errorMessages.length > 0) {
//             return res.status(400).json({ error: errorMessages.join(' and '), errorMessages })
//         }

//         const defaultMaleImageUrl = process.env.DEFAULT_MALE_IMAGE
//         const defaultFemaleImageUrl = process.env.DEFAULT_FEMALE_IMAGE
//         const defaultAdminImageUrl = process.env.DEFAULT_ADMIN_IMAGE

//         const formattedGender = gender ? gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase() : "";

//         const profileImage = image || (gender === "female" ? defaultFemaleImageUrl : defaultMaleImageUrl);
//         const isAdmin = role === 'admin' ? defaultAdminImageUrl : profileImage

//         const salt = await bcrypt.genSalt(10)
//         const hash = await bcrypt.hash(password, salt)

//         const user = await User.create({
//             email,
//             username,
//             password: hash,
//             firstName: firstName ?? "",
//             lastName: lastName ?? "",
//             age: age ?? "",
//             gender: formattedGender,
//             image: isAdmin,
//             role
//         })

//         res.status(200).json(user)
//     } catch (error) {
//         res.status(400).json({ error: error.message })
//     }
// }

// SendEmailVerifiy

const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
};

const initiateUserRegistration = async (req, res) => {
    const { email, username, password, firstName, lastName, age, gender, image, role } = req.body;

    try {
        const existingUserByEmail = await User.findOne({ email: email });
        const existingUserByUsername = await User.findOne({ username: username });

        // Create an array to store error messages
        let errorMessages = [];

        if (existingUserByEmail) {
            errorMessages.push('Email is already taken');
        }

        if (existingUserByUsername) {
            errorMessages.push('Username is already taken');
        }

        if (errorMessages.length > 0) {
            return res.status(400).json({ error: errorMessages.join(' and '), errorMessages });
        }

        // Generate verification code
        const verificationCode = generateVerificationCode();

        // Store user registration data and verification code temporarily
        const existingVerification = await Verification.findOne({ email });

        if (existingVerification) {
            existingVerification.code = verificationCode;
            await existingVerification.save();
        } else {
            await Verification.create({
                email,
                code: verificationCode,
                userData: { username, password, firstName, lastName, age, gender, image, role }
            });
        }

        // Send verification email
        const emailSent = await sendVerificationEmail(email, verificationCode);

        if (emailSent) {
            res.status(200).json({
                message: 'Verification code sent to your email address. Please verify to complete registration.',
                email
            });
        } else {
            res.status(500).json({ error: 'Failed to send verification email' });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};


const verifyAndCreateUser = async (req, res) => {
    const { email, verificationCode, username, password, firstName, lastName, age, gender, image, role } = req.body;

    try {
        // Find the verification record
        const verification = await Verification.findOne({ email, code: verificationCode });

        if (!verification) {
            return res.status(400).json({ error: 'Invalid or expired verification code' });
        }

        // Verification successful, create the user
        // const defaultMaleImageUrl = process.env.DEFAULT_MALE_IMAGE;
        // const defaultFemaleImageUrl = process.env.DEFAULT_FEMALE_IMAGE;
        // const defaultAdminImageUrl = process.env.DEFAULT_ADMIN_IMAGE;

        // const profileImage = image || (gender === "female" ? defaultFemaleImageUrl : defaultMaleImageUrl);
        // const isAdmin = role === 'admin' ? defaultAdminImageUrl : profileImage;

        const formattedGender = gender ? gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase() : "";

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const user = await User.create({
            email,
            username,
            password: hash,
            firstName: firstName ?? "",
            lastName: lastName ?? "",
            age: age ?? "",
            gender: formattedGender,
            // image: isAdmin,
            image: image,
            role,
            isActive: true,
            isVerified: true
        });

        // Delete the verification record
        await Verification.deleteOne({ email, code: verificationCode });

        res.status(200).json({
            user,
            message: 'Email verified and user created successfully'
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};


// request password reset
const generateResetToken = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Request password reset (send email with reset token)
const requestPasswordReset = async (req, res) => {
    const { email } = req.body;

    try {
        // Find user by email
        const user = await User.findOne({ email });

        if (!user) {
            // For security reasons, don't reveal that the email doesn't exist
            return res.status(200).json({
                message: 'If your email is registered, you will receive a password reset code'
            });
        }

        // Generate reset token
        const resetToken = generateResetToken();

        // Save reset token to database
        const existingRequest = await ResetPassword.findOne({ email });
        if (existingRequest) {
            existingRequest.token = resetToken;
            await existingRequest.save();
        } else {
            await ResetPassword.create({
                userId: user._id,
                email,
                token: resetToken
            });
        }

        // Send password reset email
        const emailSent = await sendPasswordResetEmail(email, resetToken);

        if (emailSent) {
            return res.status(200).json({
                message: 'If your email is registered, you will receive a password reset code'
            });
        } else {
            return res.status(500).json({ error: 'Failed to send password reset email' });
        }
    } catch (error) {
        console.error('Password reset request error:', error);
        return res.status(500).json({ error: 'An error occurred' });
    }
};

// Verify reset token and set new password
const resetPassword = async (req, res) => {
    const { email, token, newPassword } = req.body;

    try {
        // Find reset request by email and token
        const resetRequest = await ResetPassword.findOne({ token });

        if (!resetRequest) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        // Find the user
        const user = await User.findById(resetRequest.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update user's password
        user.password = hashedPassword;
        await user.save();

        // Delete the reset request
        await ResetPassword.deleteOne({ _id: resetRequest._id });

        return res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (error) {
        console.error('Password reset error:', error);
        return res.status(500).json({ error: 'An error occurred' });
    }
};

const verifyResetToken = async (req, res) => {
    const { email, token } = req.body;

    try {
        // Find reset request by email and token
        const resetRequest = await ResetPassword.findOne({ email, token });

        if (!resetRequest) {
            return res.status(400).json({ error: 'Invalid or expired reset token', valid: false });
        }

        // Token is valid
        return res.status(200).json({ message: 'Token is valid', valid: true });
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(500).json({ error: 'An error occurred', valid: false });
    }
};












//



const loginUser = async (req, res) => {
    const { identifier, password } = req.body

    try {

        const isEmail = identifier.includes("@");
        const query = isEmail ? { email: identifier } : { username: identifier }

        const user = await User.findOne(query)

        if (!user) {
            return res.status(404).json({ error: 'Please provide a valid credentials' })
        }

        if (!user.isActive) {
            return res.status(403).json({ error: 'Your account has been deactivated.' })
        }

        const match = await bcrypt.compare(password, user.password)

        if (!match) {
            return res.status(400).json({ error: "Please provide a valid credentials" })
        }

        user.lastLogin = new Date();
        await user.save();

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { subject: 'accessApi', expiresIn: '1d' })

        return res.status(200).json({
            id: user._id,
            username: user.username,
            email: user.email,
            token,
            role: user.role
        })

    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
}

const deleteUser = async (req, res) => {

    const user = await User.deleteMany({ role: { $ne: 'admin' } })

    if (!user) {
        return res.status(404).json({ error: 'No such user' })
    }

    res.status(200).json(user)
}

const updateUser = async (req, res) => {
    const { id } = req.params
    const { email, username, password, firstName, lastName, age, gender, image } = req.body

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'No such user' })
    }

    const user = await User.findByIdAndUpdate({ _id: id }, {
        email,
        username,
        password,
        firstName,
        lastName,
        age,
        gender,
        image
    })

    if (!user) {
        return res.status(404).json({ error: 'No such user' })
    }

    res.status(200).json(user)
}

const uploadImage = async (req, res) => {
    try {
        const userId = req.body.userId
        const imagePath = req.file.filename

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.image = imagePath;
        await user.save();

        res.status(200).json({
            message: 'Image uploaded successfully',
            image: imagePath
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error uploading image',
            error: error.message
        });
    }
}

const images = async (req, res) => {
    try {
        // Fetch all users from the database
        const users = await User.find({});
        console.log('Fetched users:', users); // Debugging log

        const missingImages = [];

        // Check each user for their image path
        for (const user of users) {
            const imagePath = user.image; // Get the image path from the user document

            if (imagePath) {
                // Build the full path to the uploaded image
                const fullPath = path.join(__dirname, '../public/uploads', imagePath);

                // Check if the file exists
                if (!fs.existsSync(fullPath)) {
                    missingImages.push({ userId: user._id, image: imagePath }); // Add missing image info
                }
            }
        }

        // Respond with the list of missing images
        res.status(200).json(missingImages);
    } catch (error) {
        console.error('Error fetching missing images:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

const toggleUserStatus = async (req, res) => {

    try {
        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ error: 'No such user' })
        }

        const user = await User.findById(id)
        if (!user) {
            return res.status(404).json({ error: 'No such user' })
        }

        user.isActive = !user.isActive
        await user.save()

        return res.status(200).json({ message: `User ${user.isActive ? 'activated' : 'deactived'}`, user })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Internal Server Error' })
    }
}

module.exports = {
    getUser,
    getUsers,
    // createUser,
    deleteUser,
    updateUser,
    uploadImage,
    images,
    loginUser,
    toggleUserStatus,
    initiateUserRegistration,
    verifyAndCreateUser,
    requestPasswordReset,
    resetPassword,
    verifyResetToken
}