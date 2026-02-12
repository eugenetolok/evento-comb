import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import Cookies from "js-cookie";

const apiHost = (import.meta.env.VITE_API_HOST as string | undefined)?.replace(/\/$/, "");
const baseAxiosURL = apiHost || "/";

const axiosInstance = axios.create({
  baseURL: baseAxiosURL,
});

const axiosInstanceAuth = axios.create({
  baseURL: baseAxiosURL,
});

axiosInstanceAuth.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = Cookies.get("access_token");
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

axiosInstanceAuth.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      (error.response.status === 403 || error.response.status === 401) &&
      typeof window !== "undefined"
    ) {
      Cookies.remove("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export { axiosInstance, axiosInstanceAuth };

