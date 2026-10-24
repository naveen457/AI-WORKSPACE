import axios from "axios";
import { getToken, clearAuth } from "../utils/tokenStorage.js";

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const api = axios.create({
  baseURL: `${API_BASE_URL}/`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      clearAuth();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
        const pathname = window.location.pathname;
        if (pathname !== "/auth" && pathname !== "/" && pathname !== "/oauth-complete") {
          window.location.replace("/auth");
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
