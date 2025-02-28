const express = require('express');
const router = express.Router();
const trackController = require('../controller/assignment');
const checkUserToken = require("../middleware/jwt");

router.post('/location',checkUserToken, trackController.assignment);
// router.get('/location', checkUserToken,trackController.getAssignment);


router.post('/location/geo-fencing',checkUserToken, trackController.assignmentGeoFencing);




router.get('/member/:startDate/:endDate', checkUserToken,trackController.getMemberAssignments);
router.get('/member/:assignmentId', checkUserToken,trackController.getMemberAssignmentById);





router.patch('/location', checkUserToken,trackController.patchAssignment);
router.patch('/member', checkUserToken,trackController.patchAssignment);




router.post('/member/daily', checkUserToken,trackController.getMemberDailyAssignments);


//================================ Notifcation ===================================
router.get('/member-start-assignment/:assignmentId', checkUserToken,trackController.memberStartAssignment);
router.get('/member-start-live-tracking', checkUserToken,trackController.memberStartLiveTracker)
router.get('/member-stop-live-tracking', checkUserToken,trackController.memberStopLiveTracker)

module.exports = router;
