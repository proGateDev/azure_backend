const express = require("express");
const router = express.Router();
const controller = require("../controller/channels");
const checkUserToken = require("../middleware/jwt");
//==========================================
router.post("/", checkUserToken,controller.createChannel);  //-------> create-channel
router.get("/", checkUserToken,controller.getChannels);  //-------> fetch user-created channel

router.get("/members", checkUserToken,controller.getChannelMembers); //-------> fetched user-created channel's members
router.post("/members", checkUserToken,controller.addMemberToChannel); //-------> adding members to user-created channel
router.get("/members/attendance", checkUserToken,controller.getChannelAttendance); //-------> 


module.exports = router;
