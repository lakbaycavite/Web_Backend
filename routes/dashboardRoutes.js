const express = require('express');
const { dashboardDetails } = require('../controller/dashboardController');

const router = express.Router();

router.get('/', dashboardDetails);

module.exports = router;