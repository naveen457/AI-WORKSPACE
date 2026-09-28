const express = require("express");

const router = express.Router();
const { requireAuth } = require("../middleware/auth.middleware.js");
const {
  sendMessage,
  getThreads,
  getThreadMessages,
  getThreadGraph,
  submitFeedback,
} = require("../controllers/chat.controller.js");

router.post("/", requireAuth, sendMessage);
router.get("/threads", requireAuth, getThreads);
router.get("/threads/:threadId", requireAuth, getThreadMessages);
router.get("/threads/:threadId/graph", requireAuth, getThreadGraph);
router.post("/feedback", requireAuth, submitFeedback);

module.exports = router;
