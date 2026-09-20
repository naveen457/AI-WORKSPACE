const { logInfo, logError } = require("../utils/logger.js");

function getLlmServiceUrl() {
  return (process.env.RL_LLM_API_URL || "").replace(/\/+$/, "");
}

async function callLlmService({ message, conversationId }) {
  const serviceUrl = getLlmServiceUrl();

  if (!serviceUrl) {
    logWarn("RL LLM service URL is not configured", {
      conversationId,
    });
    const error = new Error("RL LLM service is not configured");
    error.code = "RL_LLM_SERVICE_NOT_CONFIGURED";
    throw error;
  }

  logInfo("Calling RL LLM service", {
    serviceUrl,
    conversationId,
  });

  const response = await fetch(`${serviceUrl}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      conversationId,
    }),
  });

  if (!response.ok) {
    logError("RL LLM service returned an error", {
      status: response.status,
      conversationId,
    });
    const error = new Error("Unable to reach the AI service");
    error.code = "RL_LLM_SERVICE_UNAVAILABLE";
    throw error;
  }

  const data = await response.json();

  if (!data || typeof data.content !== "string") {
    logError("RL LLM service returned an invalid response", {
      conversationId,
    });
    const error = new Error("Invalid response from the AI service");
    error.code = "RL_LLM_SERVICE_INVALID_RESPONSE";
    throw error;
  }

  return data;
}

module.exports = {
  callLlmService,
  getLlmServiceUrl,
};
