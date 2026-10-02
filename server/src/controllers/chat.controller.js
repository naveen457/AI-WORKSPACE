const { logInfo, logError } = require("../utils/logger.js");
const {
  callLlmService,
  fetchThreads,
  fetchThreadMessages,
  fetchThreadGraph,
  sendFeedback,
  fetchMetrics,
  fetchBenchmarks,
} = require("../services/llmService.js");

function getPublicUser(user) {
  return {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profilePhoto: user.profilePhoto || "",
  };
}

async function sendMessage(req, res) {
  try {
    const user = req.auth;
    if (!user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { message, conversationId } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        message: "A message is required",
      });
    }

    const trimmedMessage = message.trim();

    logInfo("Chat message received", {
      authId: user.id || user._id,
      conversationId,
      messageLength: trimmedMessage.length,
    });

    let assistantContent = null;
    let llmResponse = null;
    let usedConversationId = conversationId || null;
    let generatedConversationId = null;

    if (!usedConversationId) {
      generatedConversationId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      usedConversationId = generatedConversationId;
    }

    try {
      const userId = user.id || user._id;
      llmResponse = await callLlmService({
        message: trimmedMessage,
        conversationId: usedConversationId,
        userId,
      });

      assistantContent = llmResponse.content;
    } catch (llmError) {
      logError("RL LLM service call failed", {
        authId: user.id || user._id,
        conversationId: usedConversationId,
        error: llmError.message,
        code: llmError.code,
      });

      assistantContent =
        llmError.code === "RL_LLM_SERVICE_NOT_CONFIGURED"
          ? "The AI service is not configured yet."
          : "Unable to connect to the AI service. Please try again.";
    }

    return res.status(200).json({
      success: true,
      message: {
        role: "assistant",
        content: assistantContent,
      },
      conversationId: usedConversationId,
      architectureVersion: llmResponse?.architecture_version,
      agentsInvoked: llmResponse?.agents_invoked,
      toolsExecuted: llmResponse?.tools_executed,
      latestGraph: llmResponse?.latest_graph || null,
    });
  } catch (error) {
    logError("Chat sendMessage error", {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      message: "Unable to process chat request",
    });
  }
}

async function getThreads(req, res) {
  try {
    const userId = req.auth?.id || req.auth?._id;
    const data = await fetchThreads({ userId });
    return res.status(200).json({
      success: true,
      threads: data.threads || [],
    });
  } catch (error) {
    logError("getThreads error", { error: error.message });
    return res.status(500).json({
      success: false,
      message: "Unable to fetch threads",
      threads: [],
    });
  }
}

async function getThreadMessages(req, res) {
  try {
    const userId = req.auth?.id || req.auth?._id;
    const { threadId } = req.params;
    const data = await fetchThreadMessages({ threadId, userId });
    return res.status(200).json({
      success: true,
      threadId,
      messages: data.messages || [],
    });
  } catch (error) {
    logError("getThreadMessages error", { error: error.message });
    return res.status(500).json({
      success: false,
      message: "Unable to fetch thread messages",
      messages: [],
    });
  }
}

async function submitFeedback(req, res) {
  try {
    const userId = req.auth?.id || req.auth?._id;
    const { threadId, feedback, comment } = req.body || {};
    if (!threadId || !feedback) {
      return res.status(400).json({
        message: "threadId and feedback are required",
      });
    }

    const data = await sendFeedback({ threadId, feedback, comment, userId });
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logError("submitFeedback error", { error: error.message });
    return res.status(500).json({
      success: false,
      message: "Unable to submit feedback",
    });
  }
}

async function getThreadGraph(req, res) {
  try {
    const userId = req.auth?.id || req.auth?._id;
    const { threadId } = req.params;
    const data = await fetchThreadGraph({ threadId, userId });
    return res.status(200).json({
      success: true,
      threadId,
      graph: data.graph || null,
    });
  } catch (error) {
    logError("getThreadGraph error", { error: error.message });
    return res.status(500).json({
      success: false,
      message: "Unable to fetch thread graph",
      graph: null,
    });
  }
}

async function getUserMetrics(req, res) {
  try {
    const userId = req.auth?.id || req.auth?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { threadId } = req.query || {};
    const data = await fetchMetrics({ userId, threadId });
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logError("getUserMetrics error", { error: error.message });
    return res.status(500).json({
      success: false,
      message: "Unable to fetch user metrics",
    });
  }
}

async function getBenchmarks(req, res) {
  try {
    const data = await fetchBenchmarks();
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logError("getBenchmarks error", { error: error.message });
    return res.status(500).json({
      success: false,
      message: "Unable to fetch benchmarks",
    });
  }
}

module.exports = {
  sendMessage,
  getThreads,
  getThreadMessages,
  getThreadGraph,
  submitFeedback,
  getUserMetrics,
  getBenchmarks,
};


