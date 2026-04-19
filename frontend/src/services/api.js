import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const hasToken = !!localStorage.getItem("auth_token");
    const isCanceled = error?.code === "ERR_CANCELED";
    const hasResponse = !!error?.response;

    if (status === 401 && hasToken) {
      localStorage.removeItem("auth_user");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("userEmail");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    const isServerFailure = hasResponse && status >= 500;
    const isNetworkFailure = !hasResponse && !isCanceled;

    if (
      (isServerFailure || isNetworkFailure) &&
      window.location.pathname !== "/server-error"
    ) {
      const reason = isServerFailure
        ? "server"
        : navigator.onLine
          ? "network"
          : "offline";

      const returnTo = `${window.location.pathname}${window.location.search}`;
      sessionStorage.setItem("server_error_return_to", returnTo);
      window.location.href = `/server-error?reason=${reason}`;
    }

    return Promise.reject(error);
  }
);

export default api;
