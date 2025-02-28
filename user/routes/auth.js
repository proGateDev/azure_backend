const express = require("express");
const router = express.Router();
const controller = require("../controllers/auth");
const checkUserToken = require("../../middleware/jwt");
//==========================================
router.post("/signup", controller.signup);
router.post("/login", controller.login);
router.get("/verify-email", controller.verifyUserEmail);

// router.get("/", checkUserToken, controller.geLoggedInUser);

module.exports = router;
