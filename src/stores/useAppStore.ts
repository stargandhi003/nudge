import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from 'expo-sqlite/kv-store';

interface AppState {
  isOnboardingComplete: boolean;
  hapticEnabled: boolean;
  hidePnl: boolean;
  setOnboardingComplete: (complete: boolean) => void;
  setHapticEnabled: (enabled: boolean) => void;
  setHidePnl: (hide: boolean) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isOnboardingComplete: false,
      hapticEnabled: true,
      hidePnl: false,
      setOnboardingComplete: (complete) => set({ isOnboardingComplete: complete }),
      setHapticEnabled: (enabled) => set({ hapticEnabled: enabled }),
      setHidePnl: (hide) => set({ hidePnl: hide }),
      reset: () => set({ isOnboardingComplete: false, hapticEnabled: true, hidePnl: false }),
    }),
    {
      name: 'nudge-app',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted: any) => persisted,
    }
  )
);
