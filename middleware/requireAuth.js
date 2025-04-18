const jwt = require('jsonwebtoken')
const User = require('../models/userModel')

const requireAuth = async (req, res, next) => {

    //verify authentication
    const { authorization } = req.headers

    if (!authorization) {
        return res.status(401).json({ error: 'Authorization token required.' })
    }

    const token = authorization.split(' ')[1]

    try {
        const { userId } = jwt.verify(token, process.env.JWT_SECRET)

        req.user = await User.findById(userId).select('_id')
        //this attaches user property on req object
        next()
    } catch (error) {
        console.log(error)
        res.status(401).json({ error: 'Request is not authorized.' })
    }

}


module.exports = requireAuth