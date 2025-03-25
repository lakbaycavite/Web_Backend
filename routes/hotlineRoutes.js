const express = require('express');
const { createHotline, getHotline, getHotlines, updateHotline, deleteHotline } = require('../controller/hotlineController');

const router = express.Router();

router.get('/', getHotlines);
router.get('/:id', getHotline);
router.post('/', createHotline);
router.put('/update/:id', updateHotline);
router.delete('/delete/:id', deleteHotline);

module.exports = router;