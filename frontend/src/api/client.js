import axios from "axios";
import { cleanParams } from "../utils/format";

export const TOKEN_KEY = "hms_token";
export const USER_KEY = "hms_user";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5080/api",
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const isLogin = error.config?.url?.includes("/auth/login");
    if (error.response?.status === 401 && !isLogin) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);

/** Turns any API/network error into one readable sentence. */
export function getErrorMessage(error) {
  if (!error.response) return "Cannot reach the server. Check that the API is running.";
  const data = error.response.data;
  if (data?.errors && typeof data.errors === "object") {
    return Object.values(data.errors).flat().join(" ");
  }
  if (data?.detail) return data.detail;
  if (error.response.status === 403) return "You do not have permission to do that.";
  return data?.title || "Something went wrong. Please try again.";
}

export const http = {
  get: (url, params) => api.get(url, { params: cleanParams(params) }).then((r) => r.data),
  post: (url, body) => api.post(url, body).then((r) => r.data),
  put: (url, body) => api.put(url, body).then((r) => r.data),
  patch: (url, body) => api.patch(url, body).then((r) => r.data),
};

export default api;
