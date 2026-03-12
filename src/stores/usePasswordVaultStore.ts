import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from 'expo-sqlite/kv-store';

export interface BrokerEntry {
  id: string;
  brokerName: string;
  username: string;
  password: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface PasswordVaultState {
  // Feature toggle
  vaultEnabled: boolean;
  setVaultEnabled: (enabled: boolean) => void;

  // Broker entries
  entries: BrokerEntry[];
  addEntry: (entry: BrokerEntry) => void;
  updateEntry: (id: string, data: Partial<Omit<BrokerEntry, 'id' | 'createdAt'>>) => void;
  removeEntry: (id: string) => void;

  // Reset
  clearAll: () => void;
}

export const usePasswordVaultStore = create<PasswordVaultState>()(
  persist(
    (set) => ({
      vaultEnabled: false,
      entries: [],

      setVaultEnabled: (enabled) => set({ vaultEnabled: enabled }),

      addEntry: (entry) =>
        set((state) => ({ entries: [...state.entries, entry] })),

      updateEntry: (id, data) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id
              ? { ...e, ...data, updatedAt: new Date().toISOString() }
              : e
          ),
        })),

      removeEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        })),

      clearAll: () => set({ vaultEnabled: false, entries: [] }),
    }),
    {
      name: 'nudge-password-vault',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted: any) => persisted,
    }
  )
);
