import axios from "axios";
import { toast } from "react-toastify";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
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

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    let errorMessage = "An unexpected error occurred. Please try again.";

    if (error.response) {
      if (error.response.data && error.response.data.msg) {
        errorMessage = error.response.data.msg;
      } else if (
        error.response.data &&
        Array.isArray(error.response.data.errors)
      ) {
        errorMessage = error.response.data.errors[0].msg;
      }
    } else if (error.request) {
      errorMessage =
        "Could not connect to the server. Please check your connection.";
    } else {
      errorMessage = error.message;
    }

    toast.error(errorMessage);

    return Promise.reject(error);
  },
);

export default axiosInstance;
