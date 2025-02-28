const express = require("express");
const router = express.Router();
const controller = require("../controllers/members");
const checkUserToken = require("../../middleware/jwt");
const multer = require('multer');
const uploadData = require("../../middleware/upload");

//==========================================


router.post(
    "/",
    checkUserToken,
    uploadData.single('file'),
    controller.createUserMember
);
router.get("/list", checkUserToken, controller.getUserMembers);






router.get('/:memberId', checkUserToken, controller.getUserMemberById);
router.delete('/:memberId', controller.deleteUserMemberById);
router.get('/:memberId/daily-transit', controller.getUserMemberDailyTransit);
router.post('/activity-frequency', checkUserToken, controller.getUserMemberDailyTransitActivityFrequency);
router.post('/activity-frequency_', checkUserToken, controller.getUserMemberDailyTransitActivityFrequency_);

// ================== ATTENDANCEs ============================================

router.get("/attendance/today", checkUserToken, controller.getTodayAttendance_);
router.get("/attendance/records", checkUserToken, controller.getChannelMembersAttendance);
router.get("/attendance/records_new", checkUserToken, controller.getChannelMembersAttendance_new);



// ================== ASSIGNMENTs ============================================



router.get("/daily-assignments/:channelId", checkUserToken, controller.getChannelMembersDailyAssignments);
router.post("/assignments-records", checkUserToken, controller.getChannelMembersAssignmentsByDateRange);
router.post("/getInvalidChannelMembers", checkUserToken, controller.getInvalidChannelMembers);
router.get("/assignments/:assignmentId/:memberId", checkUserToken, controller.getUsersMemberAssignmentById);

router.get('/assignments_/:startDate/:endDate/:memberId', checkUserToken,controller.getUsersMemberAssignments);







// ================== NOTIFICATIONs ============================================

router.post("/sos", checkUserToken, controller.sendSosToMembers);
router.post("/request-live-location", checkUserToken, controller.requestLiveLocationForSelectedMembers);

router.get("/sos/:memberId", checkUserToken, controller.sendSosToMemberById);
router.get("/request-live-location/:memberId", checkUserToken, controller.requestLiveLocationForMemberById);

// ==============================================================

router.get('/:memberId/live-tracking', controller.getUserMemberLiveTracking);



router.get("/live-location-tracking/:memberId/:selectedDate", checkUserToken, controller.fetchUserLiveLocation);   // Update
router.get("/assignment-location-tracking/:memberId/:selectedDate", checkUserToken, controller.fetchUserAssignmentLocation);   // Update

router.post("/live-location-tracking-insight-report", checkUserToken, controller.fetchUserLiveLocationInsightReport);   // Update





//============ Get members last location =====================================

router.post("/last-location", checkUserToken, controller.getUserMembersLastLocation);
//============ Get members Who are not assigned Daily Tasked =====================================
router.get("/geo-fence-task/unassigned", checkUserToken, controller.getUserMembersWithoutDailyTasks);
router.post("/geo-fence-task/delete", checkUserToken, controller.deleteAssignmentsForMembers);











router.get("/teams/:memberId",checkUserToken, controller.getUserMemberTeam);    









router.get("/attendance/:memberId/:dateRange", checkUserToken, controller.getMemberAttendanceById);

module.exports = router;