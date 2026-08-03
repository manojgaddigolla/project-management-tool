import axios from "axios";
import { toast } from "react-toastify";
import { API_BASE_URL } from "../services/config";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      if (window.Clerk && window.Clerk.session) {
        const token = await window.Clerk.session.getToken();
        if (token) {
          config.headers["Authorization"] = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.error("Failed to get Clerk token", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
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

    if (error.response && error.response.status !== 401) {
      toast.error(errorMessage);
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
