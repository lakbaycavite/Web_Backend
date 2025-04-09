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
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 10
        const search = req.query.search || ''
        const skip = (page - 1) * limit

        const searchFilter = {
            $or: [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                // { user: { $regex: search, $options: 'i' } }
            ],
        };

        if (search) {
            const users = await User.find({ username: { $regex: search, $options: "i" } }).select("_id");
            const userIds = users.map(user => user._id); // Extract user IDs

            // 🔹 Include user IDs in search filter
            searchFilter.$or.push({ user: { $in: userIds } });
        }

        const total = await Post.countDocuments(searchFilter)
        const posts = await Post.find(searchFilter)
            .populate("user", "username firstName lastName age gender image")
            .populate("likedBy", "username firstName lastName image")
            .skip(skip).limit(limit).sort({ createdAt: -1 })

        // console.log('LikedBy users:', posts.likedBy.map(user => user.username));


        res.status(200).json({ posts, total, page, pages: Math.ceil(total / limit) })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

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

// create new post
// const createPost = async (req, res) => {
//     const { title, content, imageUrl, comments } = req.body
//     const userId = req.user._id
//     // const filePath = req.file ? req.file.filename : null

//     let imageUrl2;
//     if (req.file) {
//         try {
//             const result = await new Promise((resolve, reject) => {
//                 const stream = cloudinary.uploader.upload_stream(
//                     { folder: 'lakbaycavite/posts' },
//                     (error, result) => {
//                         if (error) {
//                             console.error("Cloudinary upload error:", error);
//                             reject(error);
//                         } else {
//                             resolve(result);
//                         }
//                     }
//                 );

//                 // Make sure the buffer exists before piping
//                 if (!req.file.buffer) {
//                     throw new Error('File buffer is not available');
//                 }

//                 streamifier.createReadStream(req.file.buffer).pipe(stream);
//             });

//             imageUrl2 = result.secure_url;
//         } catch (error) {
//             console.error('Error uploading to Cloudinary:', error);
//             // Handle the error appropriately, e.g.:
//             // return res.status(500).json({ error: 'Failed to upload image' });
//         }
//     }

//     try {
//         const post = await Post.create({
//             title,
//             content,
//             user: userId,
//             imageURL: imageUrl2,
//             comments,
//             is_hidden: false
//         })
//         res.status(200).json(post)
//     } catch (error) {
//         res.status(400).json({ error: error.message })
//     }
// }

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

// deleteAll

// const deletePost = async (req, res) => {
//     // const { id } = req.params

//     // if (!mongoose.Types.ObjectId.isValid(id)) {
//     //     return res.status(404).json({ error: 'No such post' })
//     // }

//     const post = await Post.deleteMany({})

//     if (!post) {
//         return res.status(404).json({ error: 'No such post' })
//     }

//     res.status(200).json(post)

// }

// update a post

// const updatePost = async (req, res) => {
//     const { id } = req.params
//     const { title, content, eventType, attachments } = req.body

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//         return res.status(404).json({ error: 'No such post' })
//     }

//     const post = await Post.findOneAndUpdate({ _id: id }, {
//         title,
//         content,
//         eventType,
//         attachments
//     })

//     if (!post) {
//         return res.status(404).json({ error: 'No such post' })
//     }

//     res.status(200).json(post)
// }

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

module.exports = {
    // createPost,
    getPosts,
    getPost,
    deletePost,
    // updatePost,
    togglePostVisibility,
    addComment,
    deleteComment,
    getComments
}