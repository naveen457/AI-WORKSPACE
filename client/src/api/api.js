import axios from "axios";

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "https://astrix-backend-lj3p.onrender.com"
).replace(/\/+$/, "");

const api = axios.create({
  baseURL: `${API_BASE_URL}/`,
});

export default api;
