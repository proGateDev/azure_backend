const express = require("express");
const router = express.Router();
const controller = require("../controllers/profile");
const checkUserToken = require("../../middleware/jwt");
//==========================================


router.post("/", controller.createAdminProfile); // Create
router.get("/", checkUserToken, controller.getAdminProfile);     // Read
router.patch("/", checkUserToken, controller.updateAdminProfile);   // Update
router.delete("/", checkUserToken, controller.deleteAdminProfile); // Delete
router.get("/list", checkUserToken, controller.getAllAdminProfiles); // Delete


module.exports = router;
