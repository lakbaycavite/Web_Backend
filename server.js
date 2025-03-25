require('dotenv').config()
require('./utils/eventTimeChecker')
const path = require('path');
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const postRoutes = require('./routes/postRoutes')
const eventRoutes = require('./routes/eventRoutes')
const userRoutes = require('./routes/userRoutes')
const hotlineRoutes = require('./routes/hotlineRoutes')
const dashboardRoutes = require('./routes/dashboardRoutes')

//express app
const app = express()

//middlewares
app.use(express.json())
app.use(cors())
app.use(express.static(path.join(__dirname, 'public')));

// - gives a function of req.body
//routes
app.use('/admin/post', postRoutes)
app.use('/admin/event', eventRoutes)
app.use('/admin/user', userRoutes)
app.use('/admin/hotline', hotlineRoutes)
app.use('/admin/dashboard', dashboardRoutes)

// connect to database
mongoose.connect(process.env.MONGO_URI)
    .then(() => {

        //listen for requests
        app.listen(process.env.PORT, () => {
            console.log('Connected to db & listening on port', process.env.PORT)
        })
    })
    .catch((error) => {
        console.log(error)
    })


