// const nodemailer = require('nodemailer');


// const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS
//     }
// })

// const sendVerificationEmail = async (email, verificationCode) => {
//     try {
//         const mailOptions = {
//             from: process.env.EMAIL_USER,
//             to: email,
//             subject: 'Email Verification',
//             html: `
//                 <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
//                 <h2 style="color: #333;">Verify Your Email Address</h2>
//                 <p>Thank you for registering! Please use the verification code below to complete your registration:</p>
//                 <div style="background-color: #f5f5f5; padding: 10px; text-align: center; margin: 20px 0; border-radius: 5px;">
//                     <h1 style="color: #4285f4; margin: 0; letter-spacing: 2px;">${verificationCode}</h1>
//                 </div>
//                 <p>If you didn't request this verification, please ignore this email.</p>
//                 <p>The verification code will expire in 10 minutes.</p>
//                 </div>
//             `
//         }

//         const info = await transporter.sendMail(mailOptions)
//         console.log("Email sent: " + info.response)
//         return true

//     } catch (error) {
//         console.log("Error sending message " + error)
//         return false
//     }
// }

// module.exports = { sendVerificationEmail }

const nodemailer = require('nodemailer');

// Create a transporter object
const transporter = nodemailer.createTransport({
    service: 'gmail', // You can use other services like 'outlook', 'yahoo', etc.
    auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASSWORD, // Your email password or App password
    }
});

// Function to send verification email
const sendVerificationEmail = async (email, verificationCode) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Email Verification',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #4285f4; margin: 0;">Lakbay Cavite</h1>
                <p style="color: #666; font-size: 14px; margin-top: 5px;">Your Gateway to Cavite's Treasures</p>
            </div>
            <h2 style="color: #333;">Verify Your Email Address</h2>
            <p>Thank you for registering with Lakbay Cavite! Please use the verification code below to complete your registration:</p>
            <div style="background-color: #f5f5f5; padding: 10px; text-align: center; margin: 20px 0; border-radius: 5px;">
                <h1 style="color: #4285f4; margin: 0; letter-spacing: 2px;">${verificationCode}</h1>
            </div>
            <p>If you didn't request this verification, please ignore this email.</p>
            <p>The verification code will expire in 10 minutes.</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
                <p>&copy; ${new Date().getFullYear()} Lakbay Cavite. All rights reserved.</p>
                <p>This is an automated message, please do not reply to this email.</p>
            </div>
        </div>
      `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

module.exports = { sendVerificationEmail };