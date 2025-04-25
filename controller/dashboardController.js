const Hotline = require('../models/hotlineModel');
const User = require('../models/userModel');
const Post = require('../models/postModel');
const Event = require('../models/eventModel');
const Feedback = require('../models/feedbackModel');

const dashboardDetails = async (req, res) => {
    try {
        const now = new Date();

        // Get date range from query params if provided
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

        // Build filter object for date filtering
        const dateFilter = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                $gte: startDate,
                $lte: endDate
            };
        } else if (startDate) {
            dateFilter.createdAt = { $gte: startDate };
        } else if (endDate) {
            dateFilter.createdAt = { $lte: endDate };
        }

        // Apply date filters to event queries
        const eventDateFilter = {};
        if (startDate && endDate) {
            eventDateFilter.start = {
                $gte: startDate,
                $lte: endDate
            };
        } else if (startDate) {
            eventDateFilter.start = { $gte: startDate };
        } else if (endDate) {
            eventDateFilter.start = { $lte: endDate };
        }

        // Fetch users with date filter if provided
        const users = await User.find(dateFilter, "age gender");

        // Calculate demographics
        const demographics = {
            gender: {},
            ageGroups: { "18-25": 0, "26-35": 0, "36-45": 0, "46+": 0 }
        };

        users.forEach(user => {
            const gender = user.gender ?
                user.gender.charAt(0).toUpperCase() + user.gender.slice(1).toLowerCase()
                : "Other / Unanswered";

            demographics.gender[gender] = (demographics.gender[gender] || 0) + 1;

            if (user.age) {
                if (user.age <= 25) demographics.ageGroups["18-25"]++
                else if (user.age <= 35) demographics.ageGroups["26-35"]++
                else if (user.age <= 45) demographics.ageGroups["36-45"]++
                else demographics.ageGroups["46+"]++
            }
        });

        // Get feedback analytics data
        // 1. Rating distribution
        const ratingDistribution = await Feedback.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: "$rating",
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]).then(results => {
            const distribution = {};
            // Initialize all ratings (1-5) with 0 count
            for (let i = 1; i <= 5; i++) {
                distribution[i] = 0;
            }
            // Fill in actual counts
            results.forEach(item => {
                if (item._id >= 1 && item._id <= 5) {
                    distribution[item._id] = item.count;
                }
            });
            return distribution;
        });

        // 2. Rating over time (monthly for the last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const ratingOverTime = await Feedback.aggregate([
            {
                $match: {
                    ...dateFilter,
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    average: { $avg: "$rating" }
                }
            },
            {
                $project: {
                    _id: 0,
                    year: "$_id.year",
                    month: "$_id.month",
                    average: { $round: ["$average", 2] }
                }
            },
            { $sort: { year: 1, month: 1 } }
        ]).then(results => {
            return results.map(item => {
                const date = new Date(item.year, item.month - 1);
                return {
                    period: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                    average: item.average
                };
            });
        });

        // 3. Category distribution
        const categoryDistribution = await Feedback.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 }
                }
            }
        ]).then(results => {
            const distribution = {};
            results.forEach(item => {
                if (item._id) {
                    distribution[item._id] = item.count;
                } else {
                    distribution['Uncategorized'] = item.count;
                }
            });
            return distribution;
        });

        // 4. Rating by category
        const ratingByCategory = await Feedback.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: "$category",
                    average: { $avg: "$rating" }
                }
            },
            {
                $project: {
                    _id: 0,
                    category: "$_id",
                    average: { $round: ["$average", 2] }
                }
            }
        ]).then(results => {
            const byCategory = {};
            results.forEach(item => {
                if (item.category) {
                    byCategory[item.category] = item.average;
                } else {
                    byCategory['Uncategorized'] = item.average;
                }
            });
            return byCategory;
        });

        // Combine feedback analytics
        const feedbackAnalytics = {
            ratingDistribution,
            ratingOverTime,
            categoryDistribution,
            ratingByCategory,
            averageRating: await Feedback.aggregate([
                { $match: dateFilter },
                {
                    $group: {
                        _id: null,
                        averageRating: { $avg: "$rating" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        averageRating: { $round: ["$averageRating", 2] }
                    }
                }
            ]).then(result => (result.length > 0 ? result[0].averageRating : 0))
        };

        // Fetch all statistics with date filters
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
            recentHotlines,
            totalFeedbacks,
            tenRecentFeedbacks,
            adminUser
        ] = await Promise.all([
            User.countDocuments(dateFilter),
            User.countDocuments({ ...dateFilter, isActive: true }),
            User.countDocuments({ ...dateFilter, isActive: false }),

            Post.countDocuments(dateFilter),
            Post.countDocuments({ ...dateFilter, is_hidden: false }),
            Post.countDocuments({ ...dateFilter, is_hidden: true }),

            Event.countDocuments(eventDateFilter),
            Event.countDocuments({ ...eventDateFilter, isActive: false }),
            Event.countDocuments({
                ...eventDateFilter,
                start: { $gt: now },
                isActive: { $ne: false }
            }),
            Event.find({
                ...eventDateFilter,
                start: { $gt: now },
                isActive: { $ne: false }
            }).sort({ start: 1 }).limit(5),
            Event.countDocuments({
                ...eventDateFilter,
                start: { $lt: now },
                end: { $gt: now }
            }),

            Hotline.countDocuments(dateFilter),

            User.find(dateFilter).sort({ createdAt: -1 }).limit(5),
            Post.find(dateFilter).sort({ createdAt: -1 }).populate("user", "username firstName lastName age gender image").limit(5),
            Event.find(eventDateFilter).sort({ createdAt: -1 }).limit(5),
            Hotline.find(dateFilter).sort({ createdAt: -1 }).limit(5),
            Feedback.countDocuments(dateFilter),
            Feedback.find(dateFilter).sort({ createdAt: -1 }).limit(10).populate("user", "email username firstName lastName age gender image"),
            User.findOne({ role: "admin" }, { username: 1, firstName: 1, lastName: 1, email: 1, image: 1 })
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
            totalFeedbacks,
            demographics,
            tenRecentFeedbacks,
            feedbackAnalytics, // Add the feedback analytics data
            dateRange: startDate && endDate ? {
                start: startDate.toISOString(),
                end: endDate.toISOString()
            } : null,
            adminUser
        });

    } catch (error) {
        console.error("Server error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

module.exports = { dashboardDetails };