import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from 'expo-sqlite/kv-store';
import { UserProfile } from '../types/models';

interface UserState {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
  updateAccountSize: (size: number) => void;
  reset: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      profile: null,
      setProfile: (profile) => set({ profile }),
      updateAccountSize: (size) =>
        set((state) => ({
          profile: state.profile
            ? { ...state.profile, accountSize: size, updatedAt: new Date().toISOString() }
            : null,
        })),
      reset: () => set({ profile: null }),
    }),
    {
      name: 'nudge-user',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted: any) => persisted,
    }
  )
);
