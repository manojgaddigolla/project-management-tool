import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'light', // default to light theme
      toggleTheme: () => set((state) => {
        const newTheme = state.theme === 'light' ? 'dark' : 'light';
        // Apply immediately
        document.documentElement.setAttribute('data-theme', newTheme);
        return { theme: newTheme };
      }),
      setTheme: (newTheme) => set(() => {
        document.documentElement.setAttribute('data-theme', newTheme);
        return { theme: newTheme };
      }),
    }),
    {
      name: 'projectrak-theme', // name of the item in the storage (must be unique)
      onRehydrateStorage: () => (state) => {
        // Runs when the store has finished rehydrating from localStorage
        if (state) {
          document.documentElement.setAttribute('data-theme', state.theme);
        }
      },
    }
  )
);

export default useThemeStore;
