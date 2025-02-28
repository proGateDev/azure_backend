const express = require("express");
const router = express.Router();
const controller = require("../controllers/auth");
const checkUserToken = require("../../middleware/jwt");
//==========================================
router.post("/login", controller.login);









// router.get("/", checkUserToken, controller.geLoggedInUser);

module.exports = router;
