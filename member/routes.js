const express = require("express");
const router = express.Router();
const memberAuthRoutes = require("./routes/auth");
const memberProfileRoutes = require("./routes/profile");
const memberTrackRoutes = require("./routes/tracking");
const subMemberskRoutes = require("./routes/subMembers");
const memberParentRoutes = require("./routes/parent");
const attendanceRoutes = require("./routes/attendance");
const assignmentRoutes = require("./routes/assignments");




router.use("/auth", memberAuthRoutes);       
router.use("/profile", memberProfileRoutes);       
router.use("/track", memberTrackRoutes);       
router.use("/team", subMemberskRoutes);       
router.use("/parent", memberParentRoutes);       
router.use('/attendance', attendanceRoutes);
router.use('/assignment', assignmentRoutes);



module.exports = router;
