const express = require("express");
const router = express.Router();
const controller = require("../controllers/auth");
const checkUserToken = require("../../middleware/jwt");
//==========================================
router.post("/login", controller.login);

router.get("/verify-email", controller.verifyEmail);
router.post("/resend-verification-email", controller.resendVerificationEmail);



module.exports = router;
