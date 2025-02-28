const express = require('express');
const router = express.Router();
const jwtDecryptController = require('../controller/jwtDecrypt');
const checkUserToken = require('../middleware/jwt');

// Route to log an activity
router.get('/decrypt',checkUserToken ,jwtDecryptController.getJWTDetails);


module.exports = router;
