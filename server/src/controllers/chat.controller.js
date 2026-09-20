const { logInfo, logError } = require("../utils/logger.js");
const { callLlmService } = require("../services/llmService.js");

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
    const user = await requireAuth(req, res);
    if (!user) return;

    const { message, conversationId } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        message: "A message is required",
      });
    }

    const trimmedMessage = message.trim();

    logInfo("Chat message received", {
      authId: user.id,
      conversationId,
      messageLength: trimmedMessage.length,
    });

    let assistantContent = null;
    let usedConversationId = conversationId || null;
    let generatedConversationId = null;

    if (!usedConversationId) {
      generatedConversationId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      usedConversationId = generatedConversationId;
    }

    try {
      const llmResponse = await callLlmService({
        message: trimmedMessage,
        conversationId: usedConversationId,
      });

      assistantContent = llmResponse.content;
    } catch (llmError) {
      logError("RL LLM service call failed", {
        authId: user.id,
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

module.exports = {
  sendMessage,
};
