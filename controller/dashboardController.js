const Hotline = require('../models/hotlineModel');
const User = require('../models/userModel');
const Post = require('../models/postModel');
const Event = require('../models/eventModel');

const dashboardDetails = async (req, res) => {

    const now = new Date();

    try {

        const users = await User.find({}, "age gender")

        const demographics = {
            gender: {},
            ageGroups: { "18-25": 0, "26-35": 0, "36-45": 0, "46+": 0 }
        }




        users.forEach(user => {
            const gender = user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1).toLowerCase() : "Other / Unanswered";
            demographics.gender[gender] = (demographics.gender[gender] || 0) + 1


            if (user.age) {
                if (user.age <= 25) demographics.ageGroups["18-25"]++
                else if (user.age <= 35) demographics.ageGroups["26-35"]++
                else if (user.age <= 45) demographics.ageGroups["36-45"]++
                else demographics.ageGroups["46+"]++
            }
        })

        // const upcomingFiveEvents = await Event.find({ start: { $gt: now } }).sort({ start: 1 }).limit(5);

        const [
            totalUsers,
            totalActiveUsers,
            totalInactiveUsers,
            totalPosts,
            totalActivePosts,
            totalInactivePosts,
            totalEvents,
            doneEvents,
            upcomingEvents,
            upcomingFiveEvents,
            ongoingEvents,
            totalHotlines,
            recentUsers,
            recentPosts,
            recentEvents,
            recentHotlines
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ isActive: true }),
            User.countDocuments({ isActive: false }),

            Post.countDocuments(),
            Post.countDocuments({ is_hidden: false }),
            Post.countDocuments({ is_hidden: true }),

            Event.countDocuments(),
            Event.countDocuments({ isActive: false }),
            Event.countDocuments({ start: { $gt: now }, isActive: { $ne: false } }),
            Event.find({ start: { $gt: now }, isActive: { $ne: false } }).sort({ start: 1 }).limit(5),
            Event.countDocuments({ start: { $lt: now }, end: { $gt: now } }),

            Hotline.countDocuments(),

            User.find().sort({ createdAt: -1 }).limit(5),
            Post.find().sort({ createdAt: -1 }).populate("user", "username firstName lastName age gender image").limit(5),
            Event.find().sort({ createdAt: -1 }).limit(5),
            Hotline.find().sort({ createdAt: -1 }).limit(5)
        ]);


        return res.status(200).json({
            totalUsers,
            totalActiveUsers,
            totalInactiveUsers,
            totalPosts,
            totalActivePosts,
            totalInactivePosts,
            totalEvents,
            doneEvents,
            upcomingEvents,
            upcomingFiveEvents,
            ongoingEvents,
            totalHotlines,
            recentUsers,
            recentPosts,
            recentEvents,
            recentHotlines,
            demographics
        });

    } catch (error) {
        return res.status(500).json({ message: "Server error" });
    }
}

module.exports = { dashboardDetails };