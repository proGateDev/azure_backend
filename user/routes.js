const express = require("express");
const router = express.Router();
const userAuthRoutes = require("./routes/auth");
const userMembersRoutes = require("./routes/members");
const userProfileRoutes = require("./routes/profile");
const userTrackRoutes = require("./routes/tracking");
const dashboardTrackRoutes = require("./routes/dashboard");


router.use("/auth", userAuthRoutes);       
router.use("/profile", userProfileRoutes);       
router.use("/members",  userMembersRoutes);       
router.use("/track",  userTrackRoutes);       
router.use("/dashboard",  dashboardTrackRoutes);       


module.exports = router;
