const cron = require('node-cron');
const Event = require('../models/eventModel');

cron.schedule('*/1 * * * *', async () => {
    console.log('Checking for expired events...');
    const now = new Date();

    await Event.updateMany(
        { end: { $lt: now }, isActive: true },
        { $set: { isActive: false } }
    );

    console.log('Expired events updated.');
});
