const express = require("express");
const router = express.Router();
const checkUserToken = require("../../middleware/jwt");
const controller = require("../controllers/assignments");

//==========================================

router.get("/geofence-setup", checkUserToken, controller.memberHasGeoFencedSetup);     // Read



module.exports = router;
