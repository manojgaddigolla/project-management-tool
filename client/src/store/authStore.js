import { create } from "zustand";

const useAuthStore = create((set, get) => ({
  token: localStorage.getItem("token") || null,

  user: null,

  isAuthenticated: !!localStorage.getItem("token"),

  loading: false,

  setToken: (token) => {
    localStorage.setItem('token', token);
    set({ token: token, isAuthenticated: true });
  },

  setUser: (userData) => {
    set({ user: userData });
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ token: null, user: null, isAuthenticated: false });
  },

  setLoading: (isLoading) => {
    set({ loading: isLoading });
  },
}));

export default useAuthStore;
