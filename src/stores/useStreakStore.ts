import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from 'expo-sqlite/kv-store';

type StreakType = 'plan' | 'journal' | 'review' | 'verdict' | 'trade_limit';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string; // YYYY-MM-DD
}

interface StreakState {
  streaks: Record<StreakType, StreakData>;

  // Actions
  recordCompletion: (type: StreakType, date?: string) => void;
  resetStreak: (type: StreakType) => void;

  // Queries
  getStreak: (type: StreakType) => StreakData;
  getAllStreaks: () => Record<StreakType, StreakData>;
  getTotalActiveStreaks: () => number;

  clearAll: () => void;
}

function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const defaultStreak: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastCompletedDate: '',
};

const defaultStreaks: Record<StreakType, StreakData> = {
  plan: { ...defaultStreak },
  journal: { ...defaultStreak },
  review: { ...defaultStreak },
  verdict: { ...defaultStreak },
  trade_limit: { ...defaultStreak },
};

export const STREAK_INFO: { type: StreakType; label: string; emoji: string; description: string }[] = [
  { type: 'plan', label: 'Daily Plan', emoji: '📋', description: 'Days with a plan set' },
  { type: 'journal', label: 'Journaling', emoji: '✍️', description: 'Days with all trades journaled' },
  { type: 'review', label: 'EOD Review', emoji: '🔍', description: 'Days with end-of-day review' },
  { type: 'verdict', label: 'Follow Verdicts', emoji: '🛡️', description: 'Days with 100% verdict adherence' },
  { type: 'trade_limit', label: 'Trade Limit', emoji: '🎯', description: 'Days within trade limit' },
];

export const useStreakStore = create<StreakState>()(
  persist(
    (set, get) => ({
      streaks: { ...defaultStreaks },

      recordCompletion: (type, date) => {
        const dateStr = date || getTodayStr();
        const yesterday = getYesterdayStr();

        set((state) => {
          const current = state.streaks[type] || { ...defaultStreak };

          // Already recorded today
          if (current.lastCompletedDate === dateStr) {
            return state;
          }

          // Check if streak continues (completed yesterday or starting fresh)
          const continues = current.lastCompletedDate === yesterday || current.currentStreak === 0;
          const newCurrent = continues ? current.currentStreak + 1 : 1;
          const newLongest = Math.max(current.longestStreak, newCurrent);

          return {
            streaks: {
              ...state.streaks,
              [type]: {
                currentStreak: newCurrent,
                longestStreak: newLongest,
                lastCompletedDate: dateStr,
              },
            },
          };
        });
      },

      resetStreak: (type) =>
        set((state) => ({
          streaks: {
            ...state.streaks,
            [type]: { ...defaultStreak },
          },
        })),

      getStreak: (type) => {
        const streak = get().streaks[type] || { ...defaultStreak };
        const today = getTodayStr();
        const yesterday = getYesterdayStr();

        // If last completion wasn't today or yesterday, streak is broken
        if (streak.lastCompletedDate !== today && streak.lastCompletedDate !== yesterday) {
          return { ...streak, currentStreak: 0 };
        }
        return streak;
      },

      getAllStreaks: () => {
        const today = getTodayStr();
        const yesterday = getYesterdayStr();
        const raw = get().streaks;
        const result: Record<string, StreakData> = {};

        for (const [key, streak] of Object.entries(raw)) {
          if (streak.lastCompletedDate !== today && streak.lastCompletedDate !== yesterday) {
            result[key] = { ...streak, currentStreak: 0 };
          } else {
            result[key] = streak;
          }
        }
        return result as Record<StreakType, StreakData>;
      },

      getTotalActiveStreaks: () => {
        const all = get().getAllStreaks();
        return Object.values(all).filter((s) => s.currentStreak > 0).length;
      },

      clearAll: () => set({ streaks: { ...defaultStreaks } }),
    }),
    {
      name: 'nudge-streaks',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted: any) => persisted,
    }
  )
);
