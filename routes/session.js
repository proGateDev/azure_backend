const express = require('express');
const router = express.Router();
const memberSessionController = require('../controller/session');

// Route to log member login (start a session)
router.post('/session/login', memberSessionController.logLogin);

// Route to log member logout (end a session)
router.post('/session/logout', memberSessionController.logLogout);

// Route to get session logs for a member
router.get('/session/:memberId', memberSessionController.getMemberSessions);

module.exports = router;
