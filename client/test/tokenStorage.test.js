import test, { describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  getToken,
  setToken,
  clearToken,
  getStoredUser,
  setStoredUser,
  clearStoredUser,
  clearAuth,
  isRemembered,
} from "../src/utils/tokenStorage.js";

// Mock localStorage and sessionStorage for Node.js test environment
function createStorageMock() {
  let store = {};
  return {
    getItem(key) {
      return store[key] !== undefined ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
  };
}

globalThis.localStorage = createStorageMock();
globalThis.sessionStorage = createStorageMock();

describe("Frontend Token & Storage Management", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  test("1. Login with Remember Me checked stores token in Local Storage and NOT in Session Storage", () => {
    const mockJwt = "header.payload.signature_remember";
    setToken(mockJwt, true);

    assert.equal(localStorage.getItem("authToken"), mockJwt);
    assert.equal(sessionStorage.getItem("authToken"), null);
    assert.equal(getToken(), mockJwt);
    assert.equal(isRemembered(), true);
  });

  test("2. Login with Remember Me unchecked stores token in Session Storage and NOT in Local Storage", () => {
    const mockJwt = "header.payload.signature_short";
    setToken(mockJwt, false);

    assert.equal(sessionStorage.getItem("authToken"), mockJwt);
    assert.equal(localStorage.getItem("authToken"), null);
    assert.equal(getToken(), mockJwt);
    assert.equal(isRemembered(), false);
  });

  test("3. Omitting rememberMe defaults to unchecked behaviour (Session Storage)", () => {
    const mockJwt = "header.payload.signature_default";
    setToken(mockJwt);

    assert.equal(sessionStorage.getItem("authToken"), mockJwt);
    assert.equal(localStorage.getItem("authToken"), null);
    assert.equal(getToken(), mockJwt);
    assert.equal(isRemembered(), false);
  });

  test("4. Existing tokens in the other storage mechanism are removed when a new login is established", () => {
    // Start with a persistent session in localStorage
    const oldToken = "old.local.token";
    setToken(oldToken, true);
    assert.equal(localStorage.getItem("authToken"), oldToken);

    // Now log in without Remember Me (sessionStorage)
    const newToken = "new.session.token";
    setToken(newToken, false);

    // Verify localStorage token was cleanly removed and only sessionStorage has the new token
    assert.equal(localStorage.getItem("authToken"), null);
    assert.equal(sessionStorage.getItem("authToken"), newToken);
    assert.equal(getToken(), newToken);

    // Switch back to Remember Me
    const persistentToken = "new.persistent.token";
    setToken(persistentToken, true);

    // Verify sessionStorage was cleanly cleared
    assert.equal(sessionStorage.getItem("authToken"), null);
    assert.equal(localStorage.getItem("authToken"), persistentToken);
    assert.equal(getToken(), persistentToken);
  });

  test("5. Stored user follows Remember Me persistence and mutual exclusivity", () => {
    const userA = { id: "123", email: "a@example.com" };
    setStoredUser(userA, true);

    assert.deepEqual(getStoredUser(), userA);
    assert.equal(sessionStorage.getItem("authUser"), null);
    assert.notEqual(localStorage.getItem("authUser"), null);

    const userB = { id: "456", email: "b@example.com" };
    setStoredUser(userB, false);

    assert.deepEqual(getStoredUser(), userB);
    assert.equal(localStorage.getItem("authUser"), null);
    assert.notEqual(sessionStorage.getItem("authUser"), null);
  });

  test("6. Logout / clearAuth clears both browser storage mechanisms", () => {
    // Artificially populate both storages to verify absolute cleanup
    localStorage.setItem("authToken", "token_a");
    localStorage.setItem("authUser", JSON.stringify({ id: "1" }));
    sessionStorage.setItem("authToken", "token_b");
    sessionStorage.setItem("authUser", JSON.stringify({ id: "2" }));

    clearAuth();

    assert.equal(localStorage.getItem("authToken"), null);
    assert.equal(localStorage.getItem("authUser"), null);
    assert.equal(sessionStorage.getItem("authToken"), null);
    assert.equal(sessionStorage.getItem("authUser"), null);
    assert.equal(getToken(), null);
    assert.equal(getStoredUser(), null);
    assert.equal(isRemembered(), false);
  });

  test("7. Reload simulation: restores authentication only when valid token exists", () => {
    // Case 1: unauthenticated reload
    assert.equal(getToken(), null);
    assert.equal(getStoredUser(), null);

    // Case 2: reload after session login
    sessionStorage.setItem("authToken", "tab_token");
    sessionStorage.setItem("authUser", JSON.stringify({ id: "tab_user" }));
    assert.equal(getToken(), "tab_token");
    assert.deepEqual(getStoredUser(), { id: "tab_user" });

    // Case 3: reload after remember login
    sessionStorage.clear();
    localStorage.setItem("authToken", "remember_token");
    localStorage.setItem("authUser", JSON.stringify({ id: "remember_user" }));
    assert.equal(getToken(), "remember_token");
    assert.deepEqual(getStoredUser(), { id: "remember_user" });
  });
});
