import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../api/api";
import {
  getToken,
  clearAuth,
  getStoredUser,
  setStoredUser,
  isRemembered,
} from "../utils/tokenStorage.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken());
  const [user, setUserState] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(true);

  // Synchronize or verify current session via /auth/me using HttpOnly cookie or header
  const checkAuth = useCallback(async () => {
    try {
      const response = await api.get("/auth/me");
      if (response.data?.user) {
        setUserState(response.data.user);
        const remembered = isRemembered();
        setStoredUser(response.data.user, remembered);
        return response.data.user;
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        clearAuth();
        setUserState(null);
        setTokenState(null);
      }
    } finally {
      setLoading(false);
    }
    return null;
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      setUserState(null);
      setTokenState(null);
    }

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  async function login(newToken, newUser, rememberMe = false) {
    const isRemember = Boolean(rememberMe);

    if (newToken) {
      setTokenState(newToken);
    }

    if (newUser) {
      setStoredUser(newUser, isRemember);
      setUserState(newUser);
    } else {
      // If user object not passed immediately (e.g. from OAuth redirect), fetch /auth/me
      await checkAuth();
    }
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore network errors during logout
    } finally {
      clearAuth();
      setUserState(null);
      setTokenState(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      }
    }
  }

  function updateUser(updatedUser) {
    const isRemember = isRemembered();
    setUserState(updatedUser);
    setStoredUser(updatedUser, isRemember);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user),
        loading,
        login,
        logout,
        updateUser,
        isRemembered,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

