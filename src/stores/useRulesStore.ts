import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from 'expo-sqlite/kv-store';
import { RiskRules, DEFAULT_RULES } from '../types/models';

interface RulesState {
  rules: RiskRules;
  setRules: (rules: RiskRules) => void;
  updateRule: <K extends keyof RiskRules>(key: K, value: RiskRules[K]) => void;
  resetToDefaults: () => void;
}

export const useRulesStore = create<RulesState>()(
  persist(
    (set) => ({
      rules: { ...DEFAULT_RULES },
      setRules: (rules) => set({ rules: { ...rules, updatedAt: new Date().toISOString() } }),
      updateRule: (key, value) =>
        set((state) => ({
          rules: { ...state.rules, [key]: value, updatedAt: new Date().toISOString() },
        })),
      resetToDefaults: () => set({ rules: { ...DEFAULT_RULES, updatedAt: new Date().toISOString() } }),
    }),
    {
      name: 'nudge-rules',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted: any) => persisted,
    }
  )
);
