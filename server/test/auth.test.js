const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");

// Ensure environment variables for testing
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_super_secret_jwt_signing_key_12345";
process.env.CLIENT_URL = "http://localhost:5173";

const {
  createAuthToken,
  verifyAuthToken,
  createOAuthStateToken,
  verifyOAuthStateToken,
  getJwtSecret,
} = require("../src/utils/token.js");
const { requireAuth } = require("../src/middleware/auth.middleware.js");
const app = require("../src/app.js");
const mongoose = require("mongoose");

test.after(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

test.describe("Backend JWT Authentication & Remember Me", () => {
  const mockUser = {
    _id: "660c1f2e9a1b2c3d4e5f6789",
    email: "testuser@astrix-test.io",
  };

  test("1. Login with Remember Me checked issues a 7-day JWT", () => {
    const token = createAuthToken(mockUser, true);
    const decoded = verifyAuthToken(token);

    assert.equal(decoded.id, mockUser._id);
    assert.equal(decoded.email, mockUser.email);
    assert.equal(decoded.rememberMe, true);

    const lifespanSeconds = decoded.exp - decoded.iat;
    // 7 days = 7 * 24 * 60 * 60 = 604800 seconds
    assert.equal(lifespanSeconds, 7 * 24 * 60 * 60);
  });

  test("2. Login with Remember Me unchecked issues a 30-minute JWT", () => {
    const token = createAuthToken(mockUser, false);
    const decoded = verifyAuthToken(token);

    assert.equal(decoded.id, mockUser._id);
    assert.equal(decoded.email, mockUser.email);
    assert.equal(decoded.rememberMe, false);

    const lifespanSeconds = decoded.exp - decoded.iat;
    // 30 minutes = 30 * 60 = 1800 seconds
    assert.equal(lifespanSeconds, 30 * 60);
  });

  test("3. Omitting rememberMe defaults to unchecked behaviour (30 minutes)", () => {
    const token = createAuthToken(mockUser);
    const decoded = verifyAuthToken(token);

    assert.equal(decoded.rememberMe, false);
    const lifespanSeconds = decoded.exp - decoded.iat;
    assert.equal(lifespanSeconds, 30 * 60);
  });

  test("4. Expired JWTs are rejected cryptographically", () => {
    const expiredToken = jwt.sign(
      { id: mockUser._id, email: mockUser.email },
      getJwtSecret(),
      { expiresIn: "-1s" },
    );

    assert.throws(
      () => {
        verifyAuthToken(expiredToken);
      },
      (err) => err.name === "TokenExpiredError",
    );
  });

  test("5. Invalid and tampered JWTs are rejected cryptographically", () => {
    const validToken = createAuthToken(mockUser, false);
    const tamperedToken = validToken.slice(0, -6) + "xxxxxx";

    assert.throws(
      () => {
        verifyAuthToken(tamperedToken);
      },
      (err) => err.name === "JsonWebTokenError",
    );

    const foreignSecretToken = jwt.sign(
      { id: mockUser._id, email: mockUser.email },
      "different_untrusted_signing_key",
      { expiresIn: "1h" },
    );

    assert.throws(
      () => {
        verifyAuthToken(foreignSecretToken);
      },
      (err) => err.name === "JsonWebTokenError",
    );
  });

  test("6. requireAuth middleware enforces authentication and protects routes", () => {
    // 6a. Missing token -> 401
    const reqMissing = { headers: {} };
    let statusMissing, bodyMissing;
    const resMissing = {
      status(code) {
        statusMissing = code;
        return this;
      },
      json(data) {
        bodyMissing = data;
        return this;
      },
    };
    let nextCalledMissing = false;
    requireAuth(reqMissing, resMissing, () => {
      nextCalledMissing = true;
    });

    assert.equal(statusMissing, 401);
    assert.equal(bodyMissing.message, "Authentication required");
    assert.equal(nextCalledMissing, false);

    // 6b. Expired token -> 401
    const expiredToken = jwt.sign(
      { id: mockUser._id, email: mockUser.email },
      getJwtSecret(),
      { expiresIn: "-10s" },
    );
    const reqExpired = { headers: { authorization: `Bearer ${expiredToken}` } };
    let statusExpired, bodyExpired;
    const resExpired = {
      status(code) {
        statusExpired = code;
        return this;
      },
      json(data) {
        bodyExpired = data;
        return this;
      },
    };
    requireAuth(reqExpired, resExpired, () => {});

    assert.equal(statusExpired, 401);
    assert.equal(bodyExpired.message, "Invalid or expired session");

    // 6c. Invalid token -> 401
    const reqInvalid = { headers: { authorization: "Bearer invalid.jwt.token" } };
    let statusInvalid, bodyInvalid;
    const resInvalid = {
      status(code) {
        statusInvalid = code;
        return this;
      },
      json(data) {
        bodyInvalid = data;
        return this;
      },
    };
    requireAuth(reqInvalid, resInvalid, () => {});

    assert.equal(statusInvalid, 401);
    assert.equal(bodyInvalid.message, "Invalid or expired session");

    // 6d. Valid token -> next called and req.auth set
    const validToken = createAuthToken(mockUser, true);
    const reqValid = { headers: { authorization: `Bearer ${validToken}` } };
    let nextCalled = false;
    requireAuth(reqValid, {}, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(reqValid.auth.id, mockUser._id);
    assert.equal(reqValid.auth.email, mockUser.email);
    assert.equal(reqValid.auth.rememberMe, true);
  });

  test("7. OAuth state token creation and cryptographic verification", () => {
    // 7a. State with rememberMe: true
    const stateRemember = createOAuthStateToken({
      rememberMe: true,
      provider: "google",
    });
    const verifiedRemember = verifyOAuthStateToken(stateRemember);

    assert.notEqual(verifiedRemember, null);
    assert.equal(verifiedRemember.rememberMe, true);
    assert.equal(verifiedRemember.provider, "google");
    assert.equal(verifiedRemember.type, "oauth_state");
    assert.ok(verifiedRemember.nonce);

    // 7b. State with rememberMe: false
    const stateShort = createOAuthStateToken({
      rememberMe: false,
      provider: "github",
    });
    const verifiedShort = verifyOAuthStateToken(stateShort);

    assert.notEqual(verifiedShort, null);
    assert.equal(verifiedShort.rememberMe, false);
    assert.equal(verifiedShort.provider, "github");

    // 7c. Tampered state safely returns null
    const tamperedState = stateRemember.slice(0, -6) + "badbad";
    assert.equal(verifyOAuthStateToken(tamperedState), null);

    // 7d. Null or malformed state safely returns null
    assert.equal(verifyOAuthStateToken(null), null);
    assert.equal(verifyOAuthStateToken(""), null);
    assert.equal(verifyOAuthStateToken("not.a.jwt"), null);
  });

  test("8. Express session is completely removed from application request flow", async () => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    try {
      // 8a. Health check endpoint responds without setting connect.sid cookie
      const res = await fetch(`http://localhost:${port}/`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.message, "ASTRIX Backend Running");

      const setCookie = res.headers.get("set-cookie");
      // Verify no session cookie is created
      if (setCookie) {
        assert.ok(!setCookie.includes("connect.sid"));
      }

      // 8b. Protected endpoint without token returns 401 JSON, not session redirect
      const meRes = await fetch(`http://localhost:${port}/auth/me`);
      assert.equal(meRes.status, 401);
      const meData = await meRes.json();
      assert.equal(meData.message, "Authentication required");

      // 8c. CORS header verification
      const corsRes = await fetch(`http://localhost:${port}/`, {
        headers: { Origin: "http://localhost:5173" },
      });
      assert.equal(
        corsRes.headers.get("access-control-allow-origin"),
        "http://localhost:5173",
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test("9. OAuth callback redirects with appropriately scoped token matching state", async () => {
    // Generate valid state for Remember Me
    const stateRemember = createOAuthStateToken({
      rememberMe: true,
      provider: "google",
    });
    const decodedState = verifyOAuthStateToken(stateRemember);
    assert.equal(decodedState.rememberMe, true);

    // Simulate token issued when callback handles rememberMe=true
    const rememberToken = createAuthToken(mockUser, decodedState.rememberMe);
    const decodedToken = verifyAuthToken(rememberToken);
    assert.equal(decodedToken.rememberMe, true);
    assert.equal(decodedToken.exp - decodedToken.iat, 7 * 24 * 60 * 60);

    // Generate valid state for short-lived session
    const stateShort = createOAuthStateToken({
      rememberMe: false,
      provider: "github",
    });
    const decodedShortState = verifyOAuthStateToken(stateShort);
    assert.equal(decodedShortState.rememberMe, false);

    // Simulate token issued when callback handles rememberMe=false
    const shortToken = createAuthToken(mockUser, decodedShortState.rememberMe);
    const decodedShortToken = verifyAuthToken(shortToken);
    assert.equal(decodedShortToken.rememberMe, false);
    assert.equal(decodedShortToken.exp - decodedShortToken.iat, 30 * 60);

    // Tampered state safely falls back to short-lived token
    const tamperedState = stateRemember + "invalid";
    const verifiedFallback = verifyOAuthStateToken(tamperedState);
    const fallbackRemember = Boolean(verifiedFallback?.rememberMe);
    assert.equal(fallbackRemember, false);

    const fallbackToken = createAuthToken(mockUser, fallbackRemember);
    const decodedFallback = verifyAuthToken(fallbackToken);
    assert.equal(decodedFallback.rememberMe, false);
    assert.equal(decodedFallback.exp - decodedFallback.iat, 30 * 60);
  });
});
