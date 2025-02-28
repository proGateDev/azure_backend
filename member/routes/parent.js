const express = require("express");
const router = express.Router();
const checkUserToken = require("../../middleware/jwt");
const controller = require("../../member/controllers/parent");

//==========================================

router.get("/", checkUserToken, controller.fetchMemberParent);     // Read
router.get("/is-within-geo-fenced/:latitude/:longitude", checkUserToken, controller.isWithinGeoFenced);     // Read



module.exports = router;
