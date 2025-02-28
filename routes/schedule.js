const express = require('express');
const router = express.Router();
const scheduleController = require('../controller/schedule');

// Route to create a schedule for a member
router.post('/schedule', scheduleController.createSchedule);

// Route to fetch schedules for a member
router.get('/schedule/:memberId', scheduleController.getSchedules);

module.exports = router;
