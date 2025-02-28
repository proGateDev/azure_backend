const express = require("express");
const router = express.Router();
const controller = require("../controllers/tracking");
const checkUserToken = require("../../middleware/jwt");
//==========================================


router.put("/",checkUserToken, controller.updateMemberLocation); 
router.post("/records",checkUserToken, controller.postMemberLocation); 
router.get("/records",checkUserToken, controller.getMemberLocationsRecords); 
router.get("/records-for-map",checkUserToken, controller.getMemberLocationsRecordsForMap); 

// router.get("/records",checkUserToken, controller.getMemberLocations); 

router.post("/live-location-tracking-insight-report",checkUserToken, controller.fetchMemberLiveLocationInsightReport); 
// router.post("/live-location-tracking-insight-report",checkUserToken, controller.fetchMemberLiveLocationInsightReport); 

router.get("/records/live",checkUserToken, controller.getMemberLiveTrackingRecords); 

module.exports = router;

