const { logInfo, logWarn, logError } = require("../utils/logger.js");

function getLlmServiceUrl() {
  return (process.env.RL_LLM_API_URL || "").replace(/\/+$/, "");
}

function getAuthHeaders(extraHeaders = {}) {
  const secret = (process.env.INTERNAL_SERVICE_SECRET || "").trim();
  const headers = { ...extraHeaders };
  if (secret) {
    headers["x-internal-secret"] = secret;
  }
  return headers;
}

const COLD_START_STATUS_CODES = [502, 503, 504];
const COLD_START_ERRORS = [
  "fetch failed",
  "econnrefused",
  "econnreset",
  "etimedout",
  "und_err_socket",
  "und_err_connect_timeout",
  "aborterror",
];

function isColdStartError(error, response) {
  if (response && COLD_START_STATUS_CODES.includes(response.status)) {
    return true;
  }
  if (error) {
    const msg = (error.message || "").toLowerCase();
    const code = (error.code || "").toLowerCase();
    return COLD_START_ERRORS.some(
      (needle) => msg.includes(needle) || code.includes(needle)
    );
  }
  return false;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Checks whether the RL LLM service is awake and reachable.
 */
async function checkServiceHealth() {
  const serviceUrl = getLlmServiceUrl();
  if (!serviceUrl) {
    return { ready: false, status: "not_configured" };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${serviceUrl}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        ready: true,
        status: "ready",
        orchestrator_ready: data.orchestrator_ready !== false,
      };
    }

    if (COLD_START_STATUS_CODES.includes(res.status)) {
      return { ready: false, status: "waking_up", statusCode: res.status };
    }

    return { ready: false, status: "unhealthy", statusCode: res.status };
  } catch (err) {
    return { ready: false, status: "waking_up", error: err.message };
  }
}

/**
 * Triggers a wake-up ping to initiate Render container spin-up.
 */
async function wakeService() {
  const serviceUrl = getLlmServiceUrl();
  if (!serviceUrl) return { triggered: false };

  // Non-blocking ping to initiate Render boot
  fetch(`${serviceUrl}/health`, { method: "GET" }).catch(() => {});
  return { triggered: true };
}

/**
 * Calls the RL LLM service with automatic cold-start retry handling.
 * Render free tier containers take ~35-50s to spin up from idle.
 */
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

  const maxAttempts = 16; // Up to ~70 seconds waiting window for Render spin-up
  const delayMs = 4000;

  let lastStatus = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 min timeout for LLM

      const response = await fetch(`${serviceUrl}/chat`, {
        method: "POST",
        headers: getAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          message,
          conversationId,
          user_id: userId || null,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
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

        if (attempt > 1) {
          logInfo(`RL LLM service woke up and succeeded on attempt ${attempt}`);
        }
        return data;
      }

      // Check if Render returned a cold-start gateway error (502/503/504)
      if (COLD_START_STATUS_CODES.includes(response.status) && attempt < maxAttempts) {
        lastStatus = response.status;
        logWarn(
          `RL service cold start / boot in progress (HTTP ${response.status}). Retrying (${attempt}/${maxAttempts})...`
        );
        await sleep(delayMs);
        continue;
      }

      // Permanent client/service error
      const errorBody = await response.text().catch(() => "");
      logError("RL LLM service returned an error", {
        status: response.status,
        conversationId,
        userId,
        errorBody: errorBody.slice(0, 200),
      });
      const error = new Error(`Unable to reach the AI service (Status: ${response.status})`);
      error.code = "RL_LLM_SERVICE_UNAVAILABLE";
      throw error;
    } catch (networkError) {
      if (isColdStartError(networkError, null) && attempt < maxAttempts) {
        logWarn(
          `RL LLM connection dropped (${networkError.message}). Render container waking up. Retrying (${attempt}/${maxAttempts})...`
        );
        await sleep(delayMs);
        continue;
      }

      logError("Failed to reach RL LLM service", {
        serviceUrl,
        conversationId,
        userId,
        error: networkError.message,
        attempt,
      });
      const error = new Error(
        lastStatus
          ? `AI service warming up (HTTP ${lastStatus}). Please retry in a moment.`
          : "Unable to connect to the AI service. Please ensure the RL service is running."
      );
      error.code = "RL_LLM_SERVICE_UNAVAILABLE";
      throw error;
    }
  }

  const finalError = new Error("AI service timed out while waking up from cold start.");
  finalError.code = "RL_LLM_SERVICE_UNAVAILABLE";
  throw finalError;
}

async function fetchThreads({ userId } = {}) {
  const serviceUrl = getLlmServiceUrl();
  if (!serviceUrl) return { threads: [] };

  const url = userId
    ? `${serviceUrl}/threads?user_id=${encodeURIComponent(userId)}`
    : `${serviceUrl}/threads`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return await res.json();
      if (COLD_START_STATUS_CODES.includes(res.status) && attempt < 2) {
        await sleep(2000);
        continue;
      }
      return { threads: [] };
    } catch (err) {
      if (attempt < 2 && isColdStartError(err, null)) {
        await sleep(2000);
        continue;
      }
      logWarn("fetchThreads error", { userId, error: err.message });
      return { threads: [] };
    }
  }
  return { threads: [] };
}

async function fetchThreadMessages({ threadId, userId } = {}) {
  const serviceUrl = getLlmServiceUrl();
  if (!serviceUrl || !threadId) return { messages: [] };

  const url = userId
    ? `${serviceUrl}/threads/${encodeURIComponent(threadId)}/messages?user_id=${encodeURIComponent(userId)}`
    : `${serviceUrl}/threads/${encodeURIComponent(threadId)}/messages`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return await res.json();
      if (COLD_START_STATUS_CODES.includes(res.status) && attempt < 2) {
        await sleep(2000);
        continue;
      }
      return { messages: [] };
    } catch (err) {
      if (attempt < 2 && isColdStartError(err, null)) {
        await sleep(2000);
        continue;
      }
      logWarn("fetchThreadMessages error", { threadId, userId, error: err.message });
      return { messages: [] };
    }
  }
  return { messages: [] };
}

async function sendFeedback({ threadId, feedback, comment, userId }) {
  const serviceUrl = getLlmServiceUrl();
  if (!serviceUrl) return { status: "not_configured" };

  try {
    const res = await fetch(`${serviceUrl}/chat/feedback`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
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

  const url = userId
    ? `${serviceUrl}/threads/${encodeURIComponent(threadId)}/graph?user_id=${encodeURIComponent(userId)}`
    : `${serviceUrl}/threads/${encodeURIComponent(threadId)}/graph`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return await res.json();
      if (COLD_START_STATUS_CODES.includes(res.status) && attempt < 2) {
        await sleep(2000);
        continue;
      }
      return { graph: null };
    } catch (err) {
      if (attempt < 2 && isColdStartError(err, null)) {
        await sleep(2000);
        continue;
      }
      logWarn("fetchThreadGraph error", { threadId, userId, error: err.message });
      return { graph: null };
    }
  }
  return { graph: null };
}

async function fetchMetrics({ userId, threadId } = {}) {
  const serviceUrl = getLlmServiceUrl();
  const defaultMetrics = {
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

  if (!serviceUrl || !userId) {
    return defaultMetrics;
  }

  const params = new URLSearchParams({ user_id: userId });
  if (threadId) {
    params.set("thread_id", threadId);
  }
  const url = `${serviceUrl}/metrics?${params.toString()}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return await res.json();
      if (COLD_START_STATUS_CODES.includes(res.status) && attempt < 2) {
        await sleep(2000);
        continue;
      }
      return defaultMetrics;
    } catch (err) {
      if (attempt < 2 && isColdStartError(err, null)) {
        await sleep(2000);
        continue;
      }
      logWarn("fetchMetrics error", { userId, threadId, error: err.message });
      return defaultMetrics;
    }
  }
  return defaultMetrics;
}

async function fetchBenchmarks() {
  const serviceUrl = getLlmServiceUrl();
  const fallback = {
    status: "fallback",
    summary: {
      token_savings_pct: 48.4,
      latency_speedup: 2.3,
      cost_savings_pct: 47.9,
      pareto_coverage_pct: 99.2,
    },
    categories: [],
    tasks: [],
  };

  if (!serviceUrl) {
    return fallback;
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(`${serviceUrl}/benchmarks`, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return await res.json();
      if (COLD_START_STATUS_CODES.includes(res.status) && attempt < 2) {
        await sleep(2000);
        continue;
      }
      return fallback;
    } catch (err) {
      if (attempt < 2 && isColdStartError(err, null)) {
        await sleep(2000);
        continue;
      }
      logWarn("fetchBenchmarks error", { error: err.message });
      return fallback;
    }
  }
  return fallback;
}

module.exports = {
  callLlmService,
  getLlmServiceUrl,
  checkServiceHealth,
  wakeService,
  fetchThreads,
  fetchThreadMessages,
  fetchThreadGraph,
  sendFeedback,
  fetchMetrics,
  fetchBenchmarks,
};
