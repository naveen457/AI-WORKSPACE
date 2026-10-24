const TOKEN_KEY = "authToken";
const USER_KEY = "authUser";

/**
 * Returns the stored JWT token, checking sessionStorage first then localStorage.
 *
 * @returns {string|null}
 */
export function getToken() {
  try {
    const sessionToken = sessionStorage.getItem(TOKEN_KEY);
    if (sessionToken) {
      return sessionToken;
    }
    const localToken = localStorage.getItem(TOKEN_KEY);
    if (localToken) {
      return localToken;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Stores the token in either localStorage (if rememberMe is true)
 * or sessionStorage (if rememberMe is false).
 * Enforces mutual exclusivity by removing any stale token from the other storage.
 *
 * @param {string} token
 * @param {boolean} rememberMe
 */
export function setToken(token, rememberMe = false) {
  try {
    if (rememberMe) {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (error) {
    console.error("Failed to set authentication token:", error);
  }
}

/**
 * Clears the auth token from both localStorage and sessionStorage.
 */
export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error("Failed to clear authentication token:", error);
  }
}

/**
 * Retrieves the cached user object, checking sessionStorage first then localStorage.
 *
 * @returns {Object|null}
 */
export function getStoredUser() {
  try {
    const sessionUser = sessionStorage.getItem(USER_KEY);
    if (sessionUser) {
      return JSON.parse(sessionUser);
    }
    const localUser = localStorage.getItem(USER_KEY);
    if (localUser) {
      return JSON.parse(localUser);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Stores user info in either localStorage or sessionStorage matching rememberMe.
 * Enforces mutual exclusivity.
 *
 * @param {Object} user
 * @param {boolean} rememberMe
 */
export function setStoredUser(user, rememberMe = false) {
  try {
    if (!user) {
      clearStoredUser();
      return;
    }
    const serialized = JSON.stringify(user);
    if (rememberMe) {
      localStorage.setItem(USER_KEY, serialized);
      sessionStorage.removeItem(USER_KEY);
    } else {
      sessionStorage.setItem(USER_KEY, serialized);
      localStorage.removeItem(USER_KEY);
    }
  } catch (error) {
    console.error("Failed to set stored user:", error);
  }
}

/**
 * Clears stored user data from both localStorage and sessionStorage.
 */
export function clearStoredUser() {
  try {
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error("Failed to clear stored user:", error);
  }
}

/**
 * Clears all authentication artifacts (token and user) from all storages.
 */
export function clearAuth() {
  clearToken();
  clearStoredUser();
}

/**
 * Indicates whether the active session was established with Remember Me (persisted in localStorage).
 *
 * @returns {boolean}
 */
export function isRemembered() {
  try {
    return Boolean(localStorage.getItem(TOKEN_KEY));
  } catch {
    return false;
  }
}
