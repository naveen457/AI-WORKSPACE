const { verifyAuthToken } = require("../utils/token.js");

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

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
};
