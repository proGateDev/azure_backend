const express = require("express");
const router = express.Router();
const adminProfileRoutes = require("./routes/profile");
const adminAuthRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const dashboardRoutes = require("./routes/dashboard");



router.use("/profile", adminProfileRoutes);  
router.use("/auth", adminAuthRoutes);       
router.use("/user", userRoutes);     
router.use("/dashboard", dashboardRoutes);     

module.exports = router;
