const { verifyAuthToken, AUTH_COOKIE_NAME } = require("../utils/token.js");

/**
 * Extracts the JWT token from incoming request.
 * Prioritizes the HttpOnly cookie, then falls back to Authorization Bearer header.
 */
function extractToken(req) {
  // 1. Check HttpOnly cookies first
  if (req.cookies) {
    if (req.cookies[AUTH_COOKIE_NAME]) {
      return req.cookies[AUTH_COOKIE_NAME];
    }
    if (req.cookies.token) {
      return req.cookies.token;
    }
  }

  // 2. Check signed cookies if enabled
  if (req.signedCookies) {
    if (req.signedCookies[AUTH_COOKIE_NAME]) {
      return req.signedCookies[AUTH_COOKIE_NAME];
    }
  }

  // 3. Fallback to Authorization: Bearer <token>
  const authHeader = req.headers?.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  return "";
}

function requireAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  try {
    req.auth = verifyAuthToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired session",
    });
  }
}

module.exports = {
  requireAuth,
  extractToken,
};

