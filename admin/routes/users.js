const express = require("express");
const router = express.Router();
const controller = require("../controllers/user");
const checkUserToken = require("../../middleware/jwt");
//==========================================


router.get("/list", checkUserToken, controller.getAllUsers);    
router.get("/:userId", checkUserToken, controller.getUserById);    

router.get("/members/list/:userId", checkUserToken, controller.getUserMembers);    
router.get('/member/assignments_/:startDate/:endDate/:userId/:memberId', checkUserToken,controller.getUsersMemberAssignments);

router.get('/members/assignments/:assignmentId/:userId/:memberId', checkUserToken,controller.getUsersMemberAssignmentById);

router.get('/members/live-location-tracking/:memberId/:selectedDate', checkUserToken,controller.fetchUserLiveLocation);

router.get("/members/attendance/:memberId/:dateRange", checkUserToken, controller.getMemberAttendanceById);


router.get("/recent/list", checkUserToken, controller.getAllRecentUsers);    









module.exports = router;
