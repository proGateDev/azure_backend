const express = require("express");
const router = express.Router();
const controller = require("../controllers/profile");
const checkUserToken = require("../../middleware/jwt");
//==========================================


router.get("/",checkUserToken, controller.getUserProfile);    
router.get("/overview",checkUserToken, controller.getUserOverview);    
router.patch("/", checkUserToken, controller.updateUserProfile);   


module.exports = router;
