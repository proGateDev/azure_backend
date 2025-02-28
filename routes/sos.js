const express = require('express');
const router = express.Router();
const sosController = require('../controller/sos');

// Route to create SOS log
router.get('/', sosController.createSOSLog);

// Route to fetch SOS logs for a member
router.get('/:memberId', sosController.getSOSLogs);

module.exports = router;
