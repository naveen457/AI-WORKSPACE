const express = require("express");

const phoneController = require("../controllers/phone.controller.js");
const { requireAuth } = require("../middleware/auth.middleware.js");

const router = express.Router();

router.post("/send-otp", requireAuth, phoneController.sendOtp);
router.post("/verify-otp", requireAuth, phoneController.verifyOtp);

module.exports = router;
