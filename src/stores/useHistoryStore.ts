import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from 'expo-sqlite/kv-store';
import { DecisionLogEntry, DailyStats, VerdictLevel, DecisionOutcome } from '../types/models';
import { format } from 'date-fns';

interface HistoryState {
  entries: DecisionLogEntry[];
  dailyStats: Record<string, DailyStats>;
  addEntry: (entry: DecisionLogEntry) => void;
  updateOutcome: (id: string, outcome: DecisionOutcome) => void;
  updatePnL: (id: string, pnl: number) => void;
  getEntriesByDate: (date: string) => DecisionLogEntry[];
  getEntriesByVerdict: (level: VerdictLevel) => DecisionLogEntry[];
  getTodayStats: () => DailyStats;
  getFollowRate: () => number;
  getStreak: () => number;
  clearAll: () => void;
}

const emptyDailyStats = (date: string): DailyStats => ({
  date,
  totalRiskUsed: 0,
  totalRiskPercent: 0,
  tradesChecked: 0,
  tradesExecuted: 0,
  openPositionCount: 0,
  openPositionTickers: [],
  sectorExposure: {},
  wins: 0,
  losses: 0,
  totalPnlDollars: 0,
  totalPnlR: 0,
  cooldownsTriggered: 0,
  cooldownsOverridden: 0,
  tradeLimitHit: false,
  tradeLimitOverridden: false,
});

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      entries: [],
      dailyStats: {},

      addEntry: (entry) =>
        set((state) => {
          const today = format(new Date(), 'yyyy-MM-dd');
          const currentDayStats = state.dailyStats[today] || emptyDailyStats(today);

          const updatedDayStats: DailyStats = {
            ...currentDayStats,
            totalRiskUsed: currentDayStats.totalRiskUsed + entry.trade.totalRisk,
            totalRiskPercent: currentDayStats.totalRiskPercent + entry.trade.riskPercent,
            tradesChecked: currentDayStats.tradesChecked + 1,
          };

          return {
            entries: [entry, ...state.entries],
            dailyStats: { ...state.dailyStats, [today]: updatedDayStats },
          };
        }),

      updateOutcome: (id, outcome) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, outcome, updatedAt: new Date().toISOString() } : e
          ),
        })),

      updatePnL: (id, pnl) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, actualPnL: pnl, updatedAt: new Date().toISOString() } : e
          ),
        })),

      getEntriesByDate: (date) => get().entries.filter((e) => e.createdAt.startsWith(date)),

      getEntriesByVerdict: (level) =>
        get().entries.filter((e) => e.verdict.level === level),

      getTodayStats: () => {
        const today = format(new Date(), 'yyyy-MM-dd');
        return get().dailyStats[today] || emptyDailyStats(today);
      },

      getFollowRate: () => {
        const entries = get().entries.filter((e) => e.outcome !== 'pending');
        if (entries.length === 0) return 100;
        const followed = entries.filter((e) => e.outcome === 'followed').length;
        return Math.round((followed / entries.length) * 100);
      },

      getStreak: () => {
        const entries = get().entries.filter((e) => e.outcome !== 'pending');
        let streak = 0;
        for (const entry of entries) {
          if (entry.outcome === 'followed') streak++;
          else break;
        }
        return streak;
      },

      clearAll: () => set({ entries: [], dailyStats: {} }),
    }),
    {
      name: 'nudge-history',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted: any) => persisted,
    }
  )
);
