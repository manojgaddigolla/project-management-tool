import axios from "axios";
import { toast } from "react-toastify";
import { API_BASE_URL } from "../services/config";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = "Bearer " + token;
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        localStorage.setItem("token", data.token);
        axiosInstance.defaults.headers.common["Authorization"] = "Bearer " + data.token;
        originalRequest.headers["Authorization"] = "Bearer " + data.token;
        processQueue(null, data.token);
        return axiosInstance(originalRequest);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem("token");
        // Force redirect to login or let authStore handle it
        window.location.href = "/login";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    let errorMessage = "An unexpected error occurred. Please try again.";

    if (error.response) {
      if (error.response.data && error.response.data.msg) {
        errorMessage = error.response.data.msg;
      } else if (error.response.data && Array.isArray(error.response.data.errors)) {
        errorMessage = error.response.data.errors[0].msg;
      }
    } else if (error.request) {
      errorMessage = "Could not connect to the server. Please check your connection.";
    } else {
      errorMessage = error.message;
    }

    // Do not toast for silent token refresh failures
    if (originalRequest.url !== `${API_BASE_URL}/auth/refresh`) {
      toast.error(errorMessage);
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
