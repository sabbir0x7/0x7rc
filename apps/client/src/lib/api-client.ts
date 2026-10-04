import axios, { AxiosInstance } from "axios";
import APP_ROUTE from "@/lib/app-route.ts";
import { isCloud } from "@/lib/config.ts";

const api: AxiosInstance = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("0x7_session_token");
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // Automatically persist returned JWT tokens and space info
    try {
      const data = response.data;
      const token =
        data?.token ||
        data?.sessionToken ||
        data?.data?.token ||
        data?.data?.sessionToken;
      if (token && typeof token === "string") {
        localStorage.setItem("0x7_session_token", token);
      }
      const spaceId = data?.spaceId || data?.data?.spaceId;
      if (spaceId && typeof spaceId === "string") {
        localStorage.setItem("0x7_active_space_id", spaceId);
      }
      const spaceSlug = data?.spaceSlug || data?.data?.spaceSlug;
      if (spaceSlug && typeof spaceSlug === "string") {
        localStorage.setItem("0x7_active_space_slug", spaceSlug);
      }
    } catch (e) {
      // ignore
    }

    // we need the response headers for these endpoints
    const exemptEndpoints = [
      "/api/pages/export",
      "/api/spaces/export",
      "/api/docx-export",
      "/api/bases/export-csv",
    ];
    if (response.request.responseURL) {
      const path = new URL(response.request.responseURL)?.pathname;
      if (path && exemptEndpoints.includes(path)) {
        return response;
      }
    }

    return response.data;
  },
  (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 401: {
          let pathname = "";
          try {
            if (error.request?.responseURL) {
              pathname = new URL(error.request.responseURL)?.pathname || "";
            } else if (error.config?.url) {
              pathname = error.config.url;
            }
          } catch (e) {
            pathname = error.config?.url || "";
          }
          if (pathname === "/api/auth/collab-token") return;
          if (pathname.includes("/research")) break;
          if (window.location.pathname.startsWith("/share/")) return;
          // Never redirect if user is on research dashboard, landing page, notes, or public docs
          if (
            window.location.pathname === "/dashboard" ||
            window.location.pathname.startsWith("/dashboard") ||
            window.location.pathname === "/welcome" ||
            window.location.pathname === "/" ||
            window.location.pathname.startsWith("/s/") ||
            window.location.pathname.startsWith("/p/") ||
            window.location.pathname.startsWith("/docs")
          ) {
            break;
          }

          // Handle unauthorized error
          redirectToLogin();
          break;
        }
        case 403:
          // Handle forbidden error
          break;
        case 404:
          // Handle not found error
          break;
        case 500:
          // Handle internal server error
          break;
        default:
          break;
      }
    }
    return Promise.reject(error);
  },
);

function redirectToLogin() {
  const exemptPaths = [
    APP_ROUTE.AUTH.LOGIN,
    APP_ROUTE.AUTH.SIGNUP,
    APP_ROUTE.AUTH.FORGOT_PASSWORD,
    APP_ROUTE.AUTH.PASSWORD_RESET,
    APP_ROUTE.AUTH.MFA_CHALLENGE,
    APP_ROUTE.AUTH.MFA_SETUP_REQUIRED,
    "/invites",
    "/oauth/consent",
    "/dashboard",
    "/welcome",
    "/s/",
    "/p/",
    "/",
  ];
  if (!exemptPaths.some((path) => window.location.pathname.startsWith(path))) {
    const redirectTo = window.location.pathname;
    if (redirectTo === APP_ROUTE.HOME) {
      window.location.href = APP_ROUTE.AUTH.LOGIN;
    } else {
      const params = new URLSearchParams({ redirect: redirectTo });
      window.location.href = `${APP_ROUTE.AUTH.LOGIN}?${params.toString()}`;
    }
  }
}

export default api;
