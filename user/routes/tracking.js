const express = require("express");
const router = express.Router();
const controller = require("../controllers/tracking");
const checkUserToken = require("../../middleware/jwt");
//==========================================


router.post("/geocode",checkUserToken, controller.getLocationFromCoordinates); // Create

module.exports = router;
