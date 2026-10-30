const { logInfo, logWarn } = require("../utils/logger.js");
const { getLlmServiceUrl } = require("./llmService.js");

let keepAliveInterval = null;
let lastActivityTimestamp = 0;

// Render free tier provides 750 free hours per month.
// Keeping a service awake 24/7 consumes 720+ hours and can exhaust the quota.
// By default, we use an Activity-Aware Keep-Alive:
// - Pings only while a user is actively on the site (session active within 15 mins).
// - When users are idle / leave, the pinger stops and lets Render sleep (0 hours consumed).
const INACTIVITY_SLEEP_WINDOW_MS = 14 * 60 * 1000; // 14 mins

function recordUserActivity() {
  lastActivityTimestamp = Date.now();
}

/**
 * Periodically pings RL_Based_AMAS only while user session is active,
 * saving the user's Render 750 monthly free hours.
 */
function startKeepAlive() {
  const serviceUrl = getLlmServiceUrl();
  if (!serviceUrl || !serviceUrl.startsWith("http")) {
    logInfo("Keep-alive service idle: No external RL_LLM_API_URL configured.");
    return;
  }

  const allow247 = process.env.ENABLE_247_KEEP_ALIVE === "true";
  const intervalMs =
    parseInt(process.env.KEEP_ALIVE_INTERVAL_MS, 10) || 8 * 60 * 1000;

  async function pingService() {
    const now = Date.now();
    const timeSinceActivity = now - lastActivityTimestamp;

    // If not in 24/7 mode and no user activity for 14 minutes, let Render sleep to save hours!
    if (!allow247 && lastActivityTimestamp > 0 && timeSinceActivity > INACTIVITY_SLEEP_WINDOW_MS) {
      logInfo("Keep-alive idle: No recent user activity. Letting Render sleep to save free-tier hours.");
      return;
    }

    try {
      const url = `${serviceUrl}/health`;
      logInfo("Activity keep-alive pinging RL service", { url });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        logInfo("Keep-alive ping successful", { status: res.status });
      }
    } catch (err) {
      logWarn("Keep-alive ping notice (service may be spinning up)", {
        error: err.message,
      });
    }
  }

  // Setup recurring interval (only pings if user was active recently or in 24/7 mode)
  keepAliveInterval = setInterval(pingService, intervalMs);

  logInfo("Activity-aware keep-alive service initialized", {
    target: serviceUrl,
    mode: allow247 ? "24/7 (Warning: consumes Render monthly quota)" : "Activity-Aware (Saves 750 free-tier hours)",
  });
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
    logInfo("Keep-alive service stopped");
  }
}

module.exports = {
  startKeepAlive,
  stopKeepAlive,
  recordUserActivity,
};
