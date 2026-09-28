import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/api";

const AuthContext = createContext(null);

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("authUser")) || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [token, setToken] = useState(() => localStorage.getItem("authToken") || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("authToken");

    if (!storedToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    async function verifyAndLoadUser() {
      try {
        const response = await api.get("/auth/me");
        if (response.data?.user) {
          setUser(response.data.user);
          setToken(storedToken);
          localStorage.setItem("authUser", JSON.stringify(response.data.user));
        }
      } catch (err) {
        console.warn("Session verification failed:", err.message);
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    }

    verifyAndLoadUser();
  }, []);

  function login(newToken, newUser) {
    if (newToken) {
      localStorage.setItem("authToken", newToken);
      setToken(newToken);
    }
    if (newUser) {
      localStorage.setItem("authUser", JSON.stringify(newUser));
      setUser(newUser);
    }
  }

  function logout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    setUser(null);
    setToken(null);
  }

  function updateUser(updatedUser) {
    setUser(updatedUser);
    localStorage.setItem("authUser", JSON.stringify(updatedUser));
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
