import { create } from "zustand";
import { loadUser as fetchUser } from "../services/authService";

const useAuthStore = create((set, get) => ({
  token: localStorage.getItem("token") || null,

  user: null,

  isAuthenticated: !!localStorage.getItem("token"),

  loading: false,

  setToken: (token) => {
    localStorage.setItem("token", token);
    set({ token: token, isAuthenticated: true });
  },

  loadUser: async () => {
    if (!get().token) {
      return set({ loading: false });
    }

    set({ loading: true });
    try {
      const userData = await fetchUser();
      set({ user: userData, isAuthenticated: true, loading: false });
    } catch {
      get().logout();
      set({ loading: false });
    }
  },

  setUser: (userData) => {
    set({ user: userData });
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ token: null, user: null, isAuthenticated: false, loading: false });
  },
}));

export default useAuthStore;
