const { logInfo, logWarn } = require("../utils/logger.js");

let keepAliveInterval = null;
let lastActivityTimestamp = 0;
let isServiceAwake = false;
let isWakeInProgress = false;

// Render free tier provides 750 free hours per month.
// Keeping a service awake 24/7 consumes 720+ hours and can exhaust the quota.
// By default, we use an Activity-Aware Keep-Alive:
// - Pings only while a user is actively on the site (session active within 14 mins).
// - When users are idle / leave, the pinger stops and lets Render sleep (0 hours consumed).
const INACTIVITY_SLEEP_WINDOW_MS = 14 * 60 * 1000; // 14 mins

function getAuthHeaders(extraHeaders = {}) {
  const secret = (process.env.INTERNAL_SERVICE_SECRET || "").trim();
  const headers = { ...extraHeaders };
  if (secret) {
    headers["x-internal-secret"] = secret;
  }
  return headers;
}

function getServiceUrl() {
  return (process.env.RL_LLM_API_URL || "").replace(/\/+$/, "");
}

function setServiceAwakeState(awake) {
  isServiceAwake = Boolean(awake);
}

function isServiceReady() {
  return isServiceAwake;
}

/**
 * Actively loops pings to the Render service until it answers 200 OK
 * or max attempts are reached. This keeps Render's edge proxy from dropping
 * the boot request during cold starts (typically 35-60s).
 */
async function triggerWakeSequence() {
  const serviceUrl = getServiceUrl();
  if (!serviceUrl || !serviceUrl.startsWith("http")) {
    return { triggered: false, reason: "no_url" };
  }

  lastActivityTimestamp = Date.now();

  if (isWakeInProgress) {
    logInfo("Wake sequence already in progress, letting active loop continue");
    return { triggered: true, status: "in_progress" };
  }

  isWakeInProgress = true;
  logInfo("Initiating active wake sequence for RL service", { serviceUrl });

  // Run in background without blocking caller
  (async () => {
    const maxAttempts = 18; // ~70-80 seconds coverage
    const intervalMs = 4000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        // Ping both /wake and /health endpoints supported by RL_Based_AMAS
        const wakeUrl = `${serviceUrl}/wake`;
        const res = await fetch(wakeUrl, {
          method: "GET",
          headers: getAuthHeaders(),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          isServiceAwake = true;
          isWakeInProgress = false;
          logInfo(`RL service responded OK on wake attempt ${attempt}! Container is warm and ready.`, {
            status: res.status,
          });
          return;
        }

        logWarn(`RL service waking up... HTTP ${res.status} on attempt ${attempt}/${maxAttempts}`);
      } catch (err) {
        logWarn(`RL service wake ping pending (${err.message}) on attempt ${attempt}/${maxAttempts}`);
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    isWakeInProgress = false;
    logWarn("Wake sequence completed maximum attempts without confirmed 200 OK");
  })();

  return { triggered: true, status: "waking_up" };
}

function recordUserActivity() {
  lastActivityTimestamp = Date.now();
  // If the service is currently not marked awake and not already in a wake loop, trigger wake
  if (!isServiceAwake && !isWakeInProgress) {
    triggerWakeSequence().catch(() => {});
  }
}

/**
 * Periodically pings RL_Based_AMAS while user session is active,
 * saving the user's Render 750 monthly free hours.
 */
function startKeepAlive() {
  const serviceUrl = getServiceUrl();
  if (!serviceUrl || !serviceUrl.startsWith("http")) {
    logInfo("Keep-alive service idle: No external RL_LLM_API_URL configured.");
    return;
  }

  const allow247 = process.env.ENABLE_247_KEEP_ALIVE === "true";
  const intervalMs =
    parseInt(process.env.KEEP_ALIVE_INTERVAL_MS, 10) || 5 * 60 * 1000; // 5 mins interval

  async function pingService() {
    const now = Date.now();
    const timeSinceActivity = now - lastActivityTimestamp;

    // If not in 24/7 mode and no user activity for 14 minutes, let Render sleep to save hours!
    if (!allow247 && (lastActivityTimestamp === 0 || timeSinceActivity > INACTIVITY_SLEEP_WINDOW_MS)) {
      logInfo("Keep-alive idle: No recent user activity. Letting Render sleep to save free-tier hours.");
      isServiceAwake = false;
      return;
    }

    try {
      const url = `${serviceUrl}/health`;
      logInfo("Activity keep-alive pinging RL service", { url });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(url, {
        method: "GET",
        headers: getAuthHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        isServiceAwake = true;
        logInfo("Keep-alive ping successful", { status: res.status });
      } else {
        isServiceAwake = false;
      }
    } catch (err) {
      isServiceAwake = false;
      logWarn("Keep-alive ping notice (service may be spinning up)", {
        error: err.message,
      });
    }
  }

  // Initial immediate check if 24/7 or if user activity exists
  if (allow247) {
    pingService().catch(() => {});
  }

  // Setup recurring interval
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
  triggerWakeSequence,
  setServiceAwakeState,
  isServiceReady,
};
