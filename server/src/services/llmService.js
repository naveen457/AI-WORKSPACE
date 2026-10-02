const { logInfo, logWarn, logError } = require("../utils/logger.js");

function getLlmServiceUrl() {
  return (process.env.RL_LLM_API_URL || "").replace(/\/+$/, "");
}

async function callLlmService({ message, conversationId, userId }) {
  const serviceUrl = getLlmServiceUrl();

  if (!serviceUrl) {
    logWarn("RL LLM service URL is not configured", {
      conversationId,
      userId,
    });
    const error = new Error("RL LLM service is not configured");
    error.code = "RL_LLM_SERVICE_NOT_CONFIGURED";
    throw error;
  }

  logInfo("Calling RL LLM service", {
    serviceUrl,
    conversationId,
    userId,
  });

  let response;
  try {
    response = await fetch(`${serviceUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        conversationId,
        user_id: userId || null,
      }),
      signal: AbortSignal.timeout(180000), // 3 min timeout for multi-agent reasoning
    });
  } catch (networkError) {
    logError("Failed to reach RL LLM service", {
      serviceUrl,
      conversationId,
      userId,
      error: networkError.message,
    });
    const error = new Error("Unable to connect to the AI service. Please ensure the RL service is running.");
    error.code = "RL_LLM_SERVICE_UNAVAILABLE";
    throw error;
  }

  if (!response.ok) {
    logError("RL LLM service returned an error", {
      status: response.status,
      conversationId,
      userId,
    });
    const error = new Error("Unable to reach the AI service");
    error.code = "RL_LLM_SERVICE_UNAVAILABLE";
    throw error;
  }

  const data = await response.json();

  if (!data || typeof data.content !== "string") {
    logError("RL LLM service returned an invalid response", {
      conversationId,
      userId,
    });
    const error = new Error("Invalid response from the AI service");
    error.code = "RL_LLM_SERVICE_INVALID_RESPONSE";
    throw error;
  }

  return data;
}

async function fetchThreads({ userId } = {}) {
  const serviceUrl = getLlmServiceUrl();
  if (!serviceUrl) return { threads: [] };

  try {
    const url = userId
      ? `${serviceUrl}/threads?user_id=${encodeURIComponent(userId)}`
      : `${serviceUrl}/threads`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { threads: [] };
    return await res.json();
  } catch (err) {
    logWarn("fetchThreads error", { userId, error: err.message });
    return { threads: [] };
  }
}

async function fetchThreadMessages({ threadId, userId } = {}) {
  const serviceUrl = getLlmServiceUrl();
  if (!serviceUrl || !threadId) return { messages: [] };

  try {
    const url = userId
      ? `${serviceUrl}/threads/${encodeURIComponent(threadId)}/messages?user_id=${encodeURIComponent(userId)}`
      : `${serviceUrl}/threads/${encodeURIComponent(threadId)}/messages`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { messages: [] };
    return await res.json();
  } catch (err) {
    logWarn("fetchThreadMessages error", { threadId, userId, error: err.message });
    return { messages: [] };
  }
}

async function sendFeedback({ threadId, feedback, comment, userId }) {
  const serviceUrl = getLlmServiceUrl();
  if (!serviceUrl) return { status: "not_configured" };

  try {
    const res = await fetch(`${serviceUrl}/chat/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        thread_id: threadId,
        feedback,
        comment,
        user_id: userId || null,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { status: "failed" };
    return await res.json();
  } catch (err) {
    logWarn("sendFeedback error", { threadId, feedback, error: err.message });
    return { status: "failed", error: err.message };
  }
}

async function fetchThreadGraph({ threadId, userId } = {}) {
  const serviceUrl = getLlmServiceUrl();
  if (!serviceUrl || !threadId) return { graph: null };

  try {
    const url = userId
      ? `${serviceUrl}/threads/${encodeURIComponent(threadId)}/graph?user_id=${encodeURIComponent(userId)}`
      : `${serviceUrl}/threads/${encodeURIComponent(threadId)}/graph`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { graph: null };
    return await res.json();
  } catch (err) {
    logWarn("fetchThreadGraph error", { threadId, userId, error: err.message });
    return { graph: null };
  }
}

async function fetchMetrics({ userId, threadId } = {}) {
  const serviceUrl = getLlmServiceUrl();
  if (!serviceUrl || !userId) {
    return {
      user_id: userId || null,
      summary: {
        total_runs: 0,
        total_tokens: 0,
        total_cost_usd: 0,
        avg_coverage: 0,
        avg_net_utility: 0,
        avg_critical_path: 0,
        avg_reward: 0,
      },
      agent_invocations: {},
      complexity_breakdown: {},
      runs: [],
    };
  }

  try {
    const params = new URLSearchParams({ user_id: userId });
    if (threadId) {
      params.set("thread_id", threadId);
    }
    const url = `${serviceUrl}/metrics?${params.toString()}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return {
        user_id: userId,
        summary: {
          total_runs: 0,
          total_tokens: 0,
          total_cost_usd: 0,
          avg_coverage: 0,
          avg_net_utility: 0,
          avg_critical_path: 0,
          avg_reward: 0,
        },
        agent_invocations: {},
        complexity_breakdown: {},
        runs: [],
      };
    }
    return await res.json();
  } catch (err) {
    logWarn("fetchMetrics error", { userId, threadId, error: err.message });
    return {
      user_id: userId,
      summary: {
        total_runs: 0,
        total_tokens: 0,
        total_cost_usd: 0,
        avg_coverage: 0,
        avg_net_utility: 0,
        avg_critical_path: 0,
        avg_reward: 0,
      },
      agent_invocations: {},
      complexity_breakdown: {},
      runs: [],
    };
  }
}

module.exports = {
  callLlmService,
  getLlmServiceUrl,
  fetchThreads,
  fetchThreadMessages,
  fetchThreadGraph,
  sendFeedback,
  fetchMetrics,
};

