import { create } from "zustand";
import api from "../services/api";

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  loading: false,

  syncUser: async () => {
    set({ loading: true });
    try {
      const { data } = await api.post("/users/sync");
      set({ user: data, isAuthenticated: true, loading: false });
    } catch (err) {
      console.error("Sync error:", err);
      set({ user: null, isAuthenticated: false, loading: false });
    }
  },

  setUser: (userData) => {
    set({ user: userData });
  },

  logout: () => {
    set({ user: null, isAuthenticated: false, loading: false });
  },
}));

export default useAuthStore;
