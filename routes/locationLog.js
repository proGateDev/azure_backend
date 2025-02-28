const express = require('express');
const router = express.Router();
const locationLogController = require('../controller/log/locationLog');

// Route to log member location
router.post('/log-test', locationLogController.createLocationLog);


module.exports = router;
