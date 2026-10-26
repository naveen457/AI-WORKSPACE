const jwt = require("jsonwebtoken");

function getJwtSecret() {
  const secret =
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV === "production" ? "" : "dev_jwt_secret_key");

  if (!secret) {
    throw new Error("JWT_SECRET is required in production");
  }

  return secret;
}

const JWT_EXPIRES_IN_REMEMBER = process.env.JWT_EXPIRES_IN_REMEMBER || "7d";
const JWT_EXPIRES_IN_SHORT = process.env.JWT_EXPIRES_IN_SHORT || "30m";

/**
 * Creates an authentication JWT with expiry governed by rememberMe.
 *
 * @param {Object} user - User model or plain user object containing _id / id and email
 * @param {boolean} [rememberMe=false] - Whether to issue a 7-day token (true) or short-lived token (false)
 * @returns {string} Signed JWT
 */
function createAuthToken(user, rememberMe = false) {
  const isRemember = Boolean(rememberMe);
  const expiresIn = isRemember ? JWT_EXPIRES_IN_REMEMBER : JWT_EXPIRES_IN_SHORT;
  const userId = user._id ? user._id.toString() : user.id ? user.id.toString() : "";

  return jwt.sign(
    {
      id: userId,
      email: user.email,
      rememberMe: isRemember,
    },
    getJwtSecret(),
    { expiresIn },
  );
}

/**
 * Cryptographically verifies an auth JWT.
 *
 * @param {string} token - Raw JWT string
 * @returns {Object} Decoded payload
 */
function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret());
}

/**
 * Creates an integrity-protected, signed state token for OAuth flows.
 * Preserves the rememberMe choice across external redirects while preventing CSRF.
 *
 * @param {Object} data - Additional metadata (e.g. { rememberMe, provider })
 * @returns {string} Signed state JWT valid for 10 minutes
 */
function createOAuthStateToken(data = {}) {
  const isRemember = Boolean(data.rememberMe);
  return jwt.sign(
    {
      provider: data.provider || "oauth",
      rememberMe: isRemember,
      type: "oauth_state",
      nonce: Math.random().toString(36).substring(2),
    },
    getJwtSecret(),
    { expiresIn: "30m" },
  );
}

/**
 * Verifies and decodes an OAuth state token.
 *
 * @param {string} state - The state parameter returned by the OAuth provider
 * @returns {Object|null} The verified payload or null if invalid/expired/tampered
 */
function verifyOAuthStateToken(state) {
  if (!state || typeof state !== "string") {
    return null;
  }
  try {
    const decoded = jwt.verify(state, getJwtSecret());
    if (decoded && decoded.type === "oauth_state") {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
}

const AUTH_COOKIE_NAME = "authToken";

/**
 * Returns options for setting the authentication cookie.
 *
 * @param {boolean} [rememberMe=false] - Whether this session uses persistent expiry (7 days) or session-like (30 mins)
 * @returns {Object} Express cookie options
 */
function getAuthCookieOptions(rememberMe = false) {
  const isProduction = process.env.NODE_ENV === "production";
  const sameSite =
    process.env.COOKIE_SAME_SITE || (isProduction ? "none" : "lax");
  const secure =
    process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === "true"
      : isProduction;

  // 7 days if rememberMe, otherwise 30 minutes
  const maxAge = rememberMe
    ? 7 * 24 * 60 * 60 * 1000
    : 30 * 60 * 1000;

  return {
    httpOnly: true,
    secure,
    sameSite,
    maxAge,
    path: "/",
  };
}

/**
 * Attaches the HttpOnly SameSite authentication cookie to the response.
 *
 * @param {import("express").Response} res - Express response object
 * @param {string} token - Signed JWT token
 * @param {boolean} [rememberMe=false] - Remember me preference
 */
function setAuthCookie(res, token, rememberMe = false) {
  if (!res || typeof res.cookie !== "function") return;
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions(rememberMe));
}

/**
 * Clears the authentication cookie from the client.
 *
 * @param {import("express").Response} res - Express response object
 */
function clearAuthCookie(res) {
  if (!res || typeof res.clearCookie !== "function") return;
  const isProduction = process.env.NODE_ENV === "production";
  const sameSite =
    process.env.COOKIE_SAME_SITE || (isProduction ? "none" : "lax");
  const secure =
    process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === "true"
      : isProduction;

  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
  });
}

module.exports = {
  getJwtSecret,
  createAuthToken,
  verifyAuthToken,
  createOAuthStateToken,
  verifyOAuthStateToken,
  JWT_EXPIRES_IN_REMEMBER,
  JWT_EXPIRES_IN_SHORT,
  AUTH_COOKIE_NAME,
  getAuthCookieOptions,
  setAuthCookie,
  clearAuthCookie,
};

