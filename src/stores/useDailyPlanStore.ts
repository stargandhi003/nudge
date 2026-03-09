import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from 'expo-sqlite/kv-store';
import { DailyPlan, EmotionTag, MarketBias } from '../types/models';

// Convert a UTC ISO string to local date string YYYY-MM-DD
function toLocalDateStr(isoStr: string): string {
  const d = new Date(isoStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

interface DailyPlanState {
  plans: DailyPlan[];

  // ─── Actions ─────────────────────────────────────────────
  addPlan: (plan: DailyPlan) => void;
  updatePlan: (id: string, data: Partial<Pick<DailyPlan, 'mood' | 'marketBias' | 'watchlist' | 'intention'>>) => void;
  deletePlan: (id: string) => void;

  // ─── Queries ─────────────────────────────────────────────
  getTodayPlan: () => DailyPlan | undefined;
  getPlanByDate: (date: string) => DailyPlan | undefined;
  getRecentPlans: (n: number) => DailyPlan[];

  clearAll: () => void;
}

export const useDailyPlanStore = create<DailyPlanState>()(
  persist(
    (set, get) => ({
      plans: [],

      addPlan: (plan) =>
        set((state) => ({ plans: [plan, ...state.plans] })),

      updatePlan: (id, data) =>
        set((state) => ({
          plans: state.plans.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...(data.mood !== undefined && { mood: data.mood }),
                  ...(data.marketBias !== undefined && { marketBias: data.marketBias }),
                  ...(data.watchlist !== undefined && { watchlist: data.watchlist }),
                  ...(data.intention !== undefined && { intention: data.intention }),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        })),

      deletePlan: (id) =>
        set((state) => ({
          plans: state.plans.filter((p) => p.id !== id),
        })),

      // ─── Queries ───────────────────────────────────────────
      getTodayPlan: () => {
        const today = getTodayStr();
        return get().plans.find((p) => p.date === today);
      },

      getPlanByDate: (date) =>
        get().plans.find((p) => p.date === date),

      getRecentPlans: (n) =>
        get().plans.slice(0, n),

      clearAll: () => set({ plans: [] }),
    }),
    {
      name: 'nudge-daily-plans',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted: any) => persisted,
    }
  )
);
