import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from 'expo-sqlite/kv-store';
import { JournalEntry, JournalCategory, EmotionTag } from '../types/models';

// Convert a UTC ISO string to local date string YYYY-MM-DD
function toLocalDateStr(isoStr: string): string {
  const d = new Date(isoStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface JournalState {
  entries: JournalEntry[];

  // ─── Actions ─────────────────────────────────────────────
  addEntry: (entry: JournalEntry) => void;
  updateEntry: (id: string, data: Partial<Pick<JournalEntry, 'category' | 'title' | 'content' | 'emotion' | 'tradeRecordId'>>) => void;
  deleteEntry: (id: string) => void;

  // ─── Queries ─────────────────────────────────────────────
  getEntriesByDate: (date: string) => JournalEntry[];
  getTodayEntries: () => JournalEntry[];
  getEntriesByCategory: (category: JournalCategory) => JournalEntry[];
  getEntryForTrade: (tradeRecordId: string) => JournalEntry | undefined;

  clearAll: () => void;
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (entry) =>
        set((state) => ({ entries: [entry, ...state.entries] })),

      updateEntry: (id, data) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id
              ? {
                  ...e,
                  ...(data.category !== undefined && { category: data.category }),
                  ...(data.title !== undefined && { title: data.title }),
                  ...(data.content !== undefined && { content: data.content }),
                  ...(data.emotion !== undefined && { emotion: data.emotion }),
                  ...(data.tradeRecordId !== undefined && { tradeRecordId: data.tradeRecordId }),
                  updatedAt: new Date().toISOString(),
                }
              : e
          ),
        })),

      deleteEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        })),

      // ─── Queries ───────────────────────────────────────────
      getEntriesByDate: (date) =>
        get().entries.filter((e) => toLocalDateStr(e.createdAt) === date),

      getTodayEntries: () => {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        return get().entries.filter((e) => toLocalDateStr(e.createdAt) === today);
      },

      getEntriesByCategory: (category) =>
        get().entries.filter((e) => e.category === category),

      getEntryForTrade: (tradeRecordId) =>
        get().entries.find((e) => e.tradeRecordId === tradeRecordId),

      clearAll: () => set({ entries: [] }),
    }),
    {
      name: 'nudge-journal',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted: any) => persisted,
    }
  )
);
