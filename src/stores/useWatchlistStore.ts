import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from 'expo-sqlite/kv-store';
import { WatchlistItem } from '../types/models';

interface WatchlistState {
  items: WatchlistItem[];
  addItem: (item: WatchlistItem) => void;
  removeItem: (id: string) => void;
  reorderItems: (items: WatchlistItem[]) => void;
  getItemByTicker: (ticker: string) => WatchlistItem | undefined;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          if (state.items.some((i) => i.ticker === item.ticker)) return state;
          return { items: [...state.items, item] };
        }),
      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      reorderItems: (items) => set({ items }),
      getItemByTicker: (ticker) => get().items.find((i) => i.ticker === ticker),
    }),
    {
      name: 'nudge-watchlist',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted: any) => persisted,
    }
  )
);
