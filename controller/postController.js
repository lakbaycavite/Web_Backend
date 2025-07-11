const Post = require('../models/postModel')
const User = require('../models/userModel')
const mongoose = require('mongoose')
const cloudinary = require('../configs/cloudinaryConfig')
const streamifier = require('streamifier')

// get all post
// const getPosts = async (req, res) => {
//     const posts = await Post.find({}).sort({ createdAt: -1 })
//     res.status(200).json(posts)
// }

const getPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const skip = (page - 1) * limit;

        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

        const searchFilter = {
            $or: [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
            ],
        };

        if (startDate && endDate) {
            searchFilter.createdAt = {
                $gte: startDate,
                $lte: endDate
            };
        }
        else if (startDate) {
            searchFilter.createdAt = { $gte: startDate };
        }
        else if (endDate) {
            searchFilter.createdAt = { $lte: endDate };
        }

        if (search) {
            const users = await User.find({ username: { $regex: search, $options: "i" } }).select("_id");
            const userIds = users.map(user => user._id);

            searchFilter.$or.push({ user: { $in: userIds } });
        }

        const total = await Post.countDocuments(searchFilter);
        const posts = await Post.find(searchFilter)
            .populate("user", "email username firstName lastName age gender image")
            .populate("likedBy", "username firstName lastName image")
            .skip(skip).limit(limit).sort({ createdAt: -1 });

        const totalVisible = await Post.countDocuments({ ...searchFilter, is_hidden: false });
        const totalHidden = await Post.countDocuments({ ...searchFilter, is_hidden: true });

        const adminUser = await User.findOne({ role: 'admin' });

        res.status(200).json({
            posts,
            total,
            totalVisible,
            totalHidden,
            page,
            pages: Math.ceil(total / limit),
            adminUser
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// get a single post
const getPost = async (req, res) => {
    const { id } = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'No such post' })
    }


    const post = await Post.findById(id).populate("user", "username firstName lastName age gender image").populate("likedBy", "username firstName lastName image")

    if (!post) {
        return res.status(404).json({ error: 'No such post' })
    }

    res.status(200).json(post)
}


// add comments
const addComment = async (req, res) => {
    const { id } = req.params
    const { text } = req.body
    const userId = req.user._id

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'No such post' })
    }

    try {
        const post = await Post.findById(id)
        if (!post) {
            return res.status(404).json({ error: 'No such post' })
        }

        // const newComment = { user: userId, text }
        post.comments.push({ user: userId, text })

        await post.save()

        res.status(200).json(post);


    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

// delete a comment

const deleteComment = async (req, res) => {
    const { postId, commentId } = req.params
    const userId = req.user._id

    if (!mongoose.Types.ObjectId.isValid(postId) || !mongoose.Types.ObjectId.isValid(commentId)) {
        return res.status(404).json({ error: 'Invalid IDs' })
    }

    try {
        const post = await Post.findById(postId)
        if (!post) {
            return res.status(404).json({ error: 'Post not found' })
        }

        // 🔹 Find the comment and check if the user is authorized to delete it
        const commentIndex = post.comments.findIndex(comment => comment._id.toString() === commentId)
        if (commentIndex === -1) {
            return res.status(403).json({ error: 'Comment not found' })
        }

        // Ensure only the comment author or post owner can delete
        if (post.comments[commentIndex].user.toString() !== userId.toString() && post.user.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Unauthorized to delete this comment' })
        }

        post.comments.splice(commentIndex, 1)
        await post.save()

        res.status(200).json({ message: 'Comment deleted', post })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

// get comments
const getComments = async (req, res) => {
    const { id } = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'No such post' });
    }

    try {
        const post = await Post.findById(id).populate('comments.user', 'username')
        if (!post) {
            return res.status(404).json({ error: 'Post not found' })
        }

        res.status(200).json(post.comments)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

// delete a post
const deletePost = async (req, res) => {
    const { id } = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'No such post' })
    }

    const post = await Post.findOneAndDelete({ _id: id })

    if (!post) {
        return res.status(404).json({ error: 'No such post' })
    }

    res.status(200).json(post)

}


const togglePostVisibility = async (req, res) => {
    const { id } = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'No such post' })
    }

    try {
        const post = await Post.findById(id)
        if (!post) {
            return res.status(404).json({ error: 'No such post' })
        }

        post.is_hidden = !post.is_hidden
        await post.save()

        res.status(200).json({ message: `Post visibility toggled to ${post.is_hidden}` })
    } catch (error) {
        res.status(500).json({ error })
    }
}

const toggleCommentVisibility = async (req, res) => {
    const { postId, commentId } = req.params

    if (!mongoose.Types.ObjectId.isValid(postId) || !mongoose.Types.ObjectId.isValid(commentId)) {
        return res.status(404).json({ error: 'Invalid IDs' })
    }

    console.log('postId:', postId)
    console.log('commentId:', commentId)

    try {
        const post = await Post.findById(postId)
        if (!post) {
            return res.status(404).json({ error: 'Post not found' })
        }

        const comment = post.comments.id(commentId)
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' })
        }

        comment.isPublic = !comment.isPublic
        console.log('comment:', comment)
        await post.save()

        res.status(200).json({ message: `Comment visibility toggled to ${comment.isPublic}` })
    } catch (error) {
        res.status(500).json({ error })
    }
}

module.exports = {
    // createPost,
    getPosts,
    getPost,
    deletePost,
    // updatePost,
    togglePostVisibility,
    toggleCommentVisibility,
    addComment,
    deleteComment,
    getComments
}