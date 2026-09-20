const express = require("express");

const router = express.Router();
const { requireAuth } = require("../middleware/auth.middleware.js");
const { sendMessage } = require("../controllers/chat.controller.js");

router.post("/", requireAuth, sendMessage);

module.exports = router;
