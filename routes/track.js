const express = require('express');
const router = express.Router();
const trackController = require('../controller/track');

// Route to create SOS log
router.post('/geo-code', trackController.geoCode);
router.post('/update-location', trackController.updateLocationSocket);


module.exports = router;
