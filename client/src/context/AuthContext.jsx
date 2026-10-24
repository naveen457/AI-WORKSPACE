import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/api";
import {
  getToken,
  setToken as setTokenInStorage,
  clearAuth,
  getStoredUser,
  setStoredUser,
  isRemembered,
} from "../utils/tokenStorage.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken());
  const [user, setUserState] = useState(() => (getToken() ? getStoredUser() : null));
  const [loading, setLoading] = useState(() => Boolean(getToken()));

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
    const currentToken = getToken();

    if (!currentToken) {
      return;
    }

    let isMounted = true;

    async function verifyAndLoadUser() {
      try {
        const response = await api.get("/auth/me");
        if (isMounted && response.data?.user) {
          const remembered = isRemembered();
          setUserState(response.data.user);
          setStoredUser(response.data.user, remembered);
        }
      } catch (err) {
        console.warn("Session verification check failed:", err.message);
        if (err.response && err.response.status === 401) {
          clearAuth();
          if (isMounted) {
            setUserState(null);
            setTokenState(null);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    verifyAndLoadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  function login(newToken, newUser, rememberMe = false) {
    const isRemember = Boolean(rememberMe);

    if (newToken) {
      setTokenInStorage(newToken, isRemember);
      setTokenState(newToken);
    }

    if (newUser) {
      setStoredUser(newUser, isRemember);
      setUserState(newUser);
    }
  }

  function logout() {
    clearAuth();
    setUserState(null);
    setTokenState(null);
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
        isAuthenticated: Boolean(token && user),
        loading,
        login,
        logout,
        updateUser,
        isRemembered,
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
