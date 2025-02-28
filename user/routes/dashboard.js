const express = require("express");
const router = express.Router();
const controller = require("../controllers/dashboard");
const checkUserToken = require("../../middleware/jwt");
//==========================================


router.get("/insight", checkUserToken, controller.getInsight);


module.exports = router;
