const express = require('express');
const router = express.Router();
const activityLogController = require('../controller/log/activityLog');

// Route to log an activity
router.post('/activity/log', activityLogController.logActivity);

// Route to get activity logs for a member
router.get('/activity/:memberId', activityLogController.getActivityLogs);

module.exports = router;
