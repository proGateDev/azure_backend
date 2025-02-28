const express = require("express");
const router = express.Router();
const controller = require("../controllers/subMembers");
const checkUserToken = require("../../middleware/jwt");
//==========================================

router.get("/", checkUserToken, controller.getMemberSubUsers);     // Read
router.get("/last-location", checkUserToken, controller.getMembersTeamLastLocation);     // Read

router.get("/:teamMemberId", checkUserToken, controller.getMemberSubUsersById);     // Read
router.get("/sos/:teamMemberId", checkUserToken, controller.sendSosToMemberById);     // Read
router.get("/request-live-location/:teamMemberId", checkUserToken, controller.requestLiveLocationForTeamMemberById);     // Read
router.post("/live-location-tracking-insight-report", checkUserToken, controller.fetchTeamMemberLiveLocationInsightReport);     // Read
router.get("/assignments_/:startDate/:endDate/:teamMemberId", checkUserToken, controller.getMemberTeamAssignments);     // Read


module.exports = router;
