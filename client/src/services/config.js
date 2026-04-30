const DEFAULT_API_ORIGIN = "http://localhost:5000";

const normalizeApiOrigin = (value) => {
  const url = (value || DEFAULT_API_ORIGIN).replace(/\/+$/, "");
  return url.endsWith("/api") ? url.slice(0, -4) : url;
};

export const API_ORIGIN = normalizeApiOrigin(import.meta.env.VITE_API_URL);
export const API_BASE_URL = `${API_ORIGIN}/api`;
