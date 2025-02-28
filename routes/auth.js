const express = require('express');
const router = express.Router();
const authController = require('../controller/auth');
const checkUserToken = require('../middleware/jwt');

// Route to log an activity
router.post('/login', authController.login);
router.post('/signup',checkUserToken, authController.signup);
router.post('/fcm-token', authController.handleFcmToken);
router.patch('/fcm-token', authController.handleFcmTokenUpdate);

module.exports = router;
