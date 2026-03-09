import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from 'expo-sqlite/kv-store';
import { format } from 'date-fns';

// Convert a UTC ISO string to local date string YYYY-MM-DD
function toLocalDateStr(isoStr: string): string {
  const d = new Date(isoStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

import {
  TradeRecord,
  TradeStatus,
  TradeOutcome,
  DecisionOutcome,
  EmotionTag,
  SetupTag,
  DisciplineScore,
  CalendarDaySummary,
  VerdictLevel,
} from '../types/models';

interface TradeRecordState {
  records: TradeRecord[];

  // ─── Actions ─────────────────────────────────────────────
  addRecord: (record: TradeRecord) => void;
  closeTrade: (id: string, data: {
    exitPrice: number;
    tradeOutcome: TradeOutcome;
    exitEmotion?: EmotionTag;
    exitNote?: string;
  }) => void;
  cancelTrade: (id: string) => void;
  updateJournal: (id: string, data: {
    entryEmotion?: EmotionTag;
    entryNote?: string;
    setupTag?: SetupTag;
    isPlanned?: boolean;
  }) => void;

  // ─── Queries ─────────────────────────────────────────────
  getActiveTrades: () => TradeRecord[];
  getClosedTrades: () => TradeRecord[];
  getTradesByDate: (date: string) => TradeRecord[];
  getTodayTrades: () => TradeRecord[];
  getTodayTradeCount: () => number;
  getConsecutiveLosses: () => number;

  // ─── Cool-down ───────────────────────────────────────────
  lastLossTimestamp: string | null;
  setLastLossTimestamp: (ts: string) => void;
  isCooldownActive: (cooldownMinutes: number) => boolean;

  // ─── Discipline Score ────────────────────────────────────
  calculateDisciplineScore: () => DisciplineScore;

  // ─── Calendar ────────────────────────────────────────────
  getCalendarSummary: (year: number, month: number) => CalendarDaySummary[];

  // ─── Performance Stats ───────────────────────────────────
  getPerformanceStats: () => {
    totalTrades: number;
    wins: number;
    losses: number;
    winRate: number;
    avgWinR: number;
    avgLossR: number;
    expectancy: number;
    profitFactor: number;
    totalPnlR: number;
    totalPnlDollars: number;
    largestWinR: number;
    largestLossR: number;
    currentStreak: number;
    equityCurveR: number[];
    winRateByEmotion: Record<string, { wins: number; total: number; rate: number }>;
    winRateBySetup: Record<string, { wins: number; total: number; rate: number }>;
  };

  clearAll: () => void;
}

export const useTradeRecordStore = create<TradeRecordState>()(
  persist(
    (set, get) => ({
      records: [],
      lastLossTimestamp: null,

      addRecord: (record) =>
        set((state) => ({ records: [record, ...state.records] })),

      closeTrade: (id, data) =>
        set((state) => ({
          records: state.records.map((r) => {
            if (r.id !== id) return r;
            const riskPerShare = r.trade.riskPerShare;
            const direction = r.trade.direction === 'buy' ? 1 : -1;
            const pnlDollars = (data.exitPrice - r.trade.entryPrice) * direction * r.trade.quantity;
            const pnlR = riskPerShare > 0 ? pnlDollars / (riskPerShare * r.trade.quantity) : 0;
            return {
              ...r,
              status: 'closed' as TradeStatus,
              exitPrice: data.exitPrice,
              exitDate: new Date().toISOString(),
              tradeOutcome: data.tradeOutcome,
              pnlDollars: Math.round(pnlDollars * 100) / 100,
              pnlR: Math.round(pnlR * 100) / 100,
              exitEmotion: data.exitEmotion,
              exitNote: data.exitNote,
              closedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          }),
          lastLossTimestamp: data.tradeOutcome === 'sl_hit' ||
            (data.tradeOutcome === 'manual_exit' &&
              (() => {
                const rec = state.records.find(r => r.id === id);
                if (!rec) return false;
                const dir = rec.trade.direction === 'buy' ? 1 : -1;
                return (data.exitPrice - rec.trade.entryPrice) * dir < 0;
              })())
            ? new Date().toISOString()
            : state.lastLossTimestamp,
        })),

      cancelTrade: (id) =>
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id
              ? { ...r, status: 'cancelled' as TradeStatus, updatedAt: new Date().toISOString() }
              : r
          ),
        })),

      updateJournal: (id, data) =>
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id
              ? {
                  ...r,
                  ...(data.entryEmotion !== undefined && { entryEmotion: data.entryEmotion }),
                  ...(data.entryNote !== undefined && { entryNote: data.entryNote }),
                  ...(data.setupTag !== undefined && { setupTag: data.setupTag }),
                  ...(data.isPlanned !== undefined && { isPlanned: data.isPlanned }),
                  updatedAt: new Date().toISOString(),
                }
              : r
          ),
        })),

      // ─── Queries ───────────────────────────────────────────
      getActiveTrades: () => get().records.filter((r) => r.status === 'active'),
      getClosedTrades: () => get().records.filter((r) => r.status === 'closed'),

      getTradesByDate: (date) =>
        get().records.filter((r) => toLocalDateStr(r.createdAt) === date),

      getTodayTrades: () => {
        const today = format(new Date(), 'yyyy-MM-dd');
        return get().records.filter((r) => toLocalDateStr(r.createdAt) === today && r.status !== 'cancelled');
      },

      getTodayTradeCount: () => {
        const today = format(new Date(), 'yyyy-MM-dd');
        return get().records.filter(
          (r) => toLocalDateStr(r.createdAt) === today && r.decision === 'followed' && r.status !== 'cancelled'
        ).length;
      },

      getConsecutiveLosses: () => {
        const closed = get().records
          .filter((r) => r.status === 'closed')
          .sort((a, b) => new Date(b.closedAt || b.updatedAt).getTime() - new Date(a.closedAt || a.updatedAt).getTime());
        let streak = 0;
        for (const r of closed) {
          if (r.pnlDollars !== undefined && r.pnlDollars < 0) streak++;
          else break;
        }
        return streak;
      },

      // ─── Cool-down ─────────────────────────────────────────
      setLastLossTimestamp: (ts) => set({ lastLossTimestamp: ts }),

      isCooldownActive: (cooldownMinutes) => {
        const ts = get().lastLossTimestamp;
        if (!ts) return false;
        const elapsed = (Date.now() - new Date(ts).getTime()) / 60000;
        return elapsed < cooldownMinutes;
      },

      // ─── Discipline Score ──────────────────────────────────
      calculateDisciplineScore: () => {
        const records = get().records.filter((r) => r.status !== 'cancelled');
        const closed = records.filter((r) => r.status === 'closed');

        // Rule adherence: % of trades where verdict was proceed and user followed
        const followedTrades = records.filter((r) => r.decision === 'followed');
        const ruleAdherence = records.length > 0
          ? Math.round((followedTrades.length / records.length) * 100)
          : 100;

        // Journal consistency: % of trades with at least an emotion or note
        const journaled = records.filter((r) => r.entryEmotion || r.entryNote);
        const journalConsistency = records.length > 0
          ? Math.round((journaled.length / records.length) * 100)
          : 100;

        // Cool-down respect
        const cooldownTrades = records.filter((r) => r.cooldownOverride !== undefined);
        const cooldownRespected = cooldownTrades.filter((r) => !r.cooldownOverride);
        const cooldownRespect = cooldownTrades.length > 0
          ? Math.round((cooldownRespected.length / cooldownTrades.length) * 100)
          : 100;

        // Trade limit respect
        const tradeLimitTrades = records.filter((r) => r.tradeLimitOverride !== undefined);
        const limitRespected = tradeLimitTrades.filter((r) => !r.tradeLimitOverride);
        const tradeLimitRespect = tradeLimitTrades.length > 0
          ? Math.round((limitRespected.length / tradeLimitTrades.length) * 100)
          : 100;

        // Plan following: % of trades that were planned
        const planned = records.filter((r) => r.isPlanned);
        const planFollowing = records.length > 0
          ? Math.round((planned.length / records.length) * 100)
          : 100;

        // Weighted overall
        const overall = Math.round(
          ruleAdherence * 0.30 +
          journalConsistency * 0.20 +
          cooldownRespect * 0.15 +
          tradeLimitRespect * 0.15 +
          planFollowing * 0.20
        );

        return {
          overall: Math.min(100, Math.max(0, overall)),
          ruleAdherence,
          journalConsistency,
          cooldownRespect,
          tradeLimitRespect,
          planFollowing,
          calculatedAt: new Date().toISOString(),
        };
      },

      // ─── Calendar ──────────────────────────────────────────
      getCalendarSummary: (year, month) => {
        const records = get().records.filter((r) => r.status !== 'cancelled');
        const prefix = `${year}-${String(month).padStart(2, '0')}`;
        const byDay: Record<string, TradeRecord[]> = {};

        for (const r of records) {
          const localDate = toLocalDateStr(r.createdAt);
          if (localDate.startsWith(prefix)) {
            if (!byDay[localDate]) byDay[localDate] = [];
            byDay[localDate].push(r);
          }
        }

        return Object.entries(byDay).map(([date, dayRecords]) => {
          const closedDay = dayRecords.filter((r) => r.status === 'closed');
          const wins = closedDay.filter((r) => r.pnlDollars !== undefined && r.pnlDollars > 0).length;
          const losses = closedDay.filter((r) => r.pnlDollars !== undefined && r.pnlDollars < 0).length;
          const pnlDollars = closedDay.reduce((sum, r) => sum + (r.pnlDollars ?? 0), 0);
          const pnlR = closedDay.reduce((sum, r) => sum + (r.pnlR ?? 0), 0);
          const planned = dayRecords.filter((r) => r.isPlanned).length;
          const unplanned = dayRecords.filter((r) => !r.isPlanned).length;

          const verdicts: Record<VerdictLevel, number> = { proceed: 0, adjust: 0, wait: 0, stop: 0 };
          dayRecords.forEach((r) => { verdicts[r.verdict.level]++; });

          // Simple daily discipline: followed / total
          const followed = dayRecords.filter((r) => r.decision === 'followed').length;
          const disciplineScore = dayRecords.length > 0
            ? Math.round((followed / dayRecords.length) * 100)
            : 100;

          return {
            date,
            totalTrades: dayRecords.length,
            wins,
            losses,
            pnlDollars: Math.round(pnlDollars * 100) / 100,
            pnlR: Math.round(pnlR * 100) / 100,
            plannedTrades: planned,
            unplannedTrades: unplanned,
            disciplineScore,
            verdicts,
          };
        }).sort((a, b) => a.date.localeCompare(b.date));
      },

      // ─── Performance Stats ─────────────────────────────────
      getPerformanceStats: () => {
        const closed = get().records
          .filter((r) => r.status === 'closed')
          .sort((a, b) => new Date(a.closedAt || a.updatedAt).getTime() - new Date(b.closedAt || b.updatedAt).getTime());

        const wins = closed.filter((r) => (r.pnlDollars ?? 0) > 0);
        const losses = closed.filter((r) => (r.pnlDollars ?? 0) < 0);
        const totalTrades = closed.length;
        const winRate = totalTrades > 0 ? Math.round((wins.length / totalTrades) * 100) : 0;

        const avgWinR = wins.length > 0
          ? Math.round((wins.reduce((s, r) => s + (r.pnlR ?? 0), 0) / wins.length) * 100) / 100
          : 0;
        const avgLossR = losses.length > 0
          ? Math.round((losses.reduce((s, r) => s + (r.pnlR ?? 0), 0) / losses.length) * 100) / 100
          : 0;

        const expectancy = totalTrades > 0
          ? Math.round(((winRate / 100) * avgWinR + ((100 - winRate) / 100) * avgLossR) * 100) / 100
          : 0;

        const grossGains = wins.reduce((s, r) => s + (r.pnlDollars ?? 0), 0);
        const grossLosses = Math.abs(losses.reduce((s, r) => s + (r.pnlDollars ?? 0), 0));
        const profitFactor = grossLosses > 0 ? Math.round((grossGains / grossLosses) * 100) / 100 : 0;

        const totalPnlR = Math.round(closed.reduce((s, r) => s + (r.pnlR ?? 0), 0) * 100) / 100;
        const totalPnlDollars = Math.round(closed.reduce((s, r) => s + (r.pnlDollars ?? 0), 0) * 100) / 100;

        const largestWinR = wins.length > 0 ? Math.max(...wins.map((r) => r.pnlR ?? 0)) : 0;
        const largestLossR = losses.length > 0 ? Math.min(...losses.map((r) => r.pnlR ?? 0)) : 0;

        // Current win/loss streak
        let currentStreak = 0;
        const reversedClosed = [...closed].reverse();
        if (reversedClosed.length > 0) {
          const first = (reversedClosed[0].pnlDollars ?? 0) > 0 ? 'win' : 'loss';
          for (const r of reversedClosed) {
            const isWin = (r.pnlDollars ?? 0) > 0;
            if ((first === 'win' && isWin) || (first === 'loss' && !isWin)) {
              currentStreak += first === 'win' ? 1 : -1;
            } else break;
          }
        }

        // Equity curve (cumulative R)
        let cumR = 0;
        const equityCurveR = closed.map((r) => {
          cumR += r.pnlR ?? 0;
          return Math.round(cumR * 100) / 100;
        });

        // Win rate by emotion
        const winRateByEmotion: Record<string, { wins: number; total: number; rate: number }> = {};
        closed.forEach((r) => {
          const emotion = r.entryEmotion || 'untagged';
          if (!winRateByEmotion[emotion]) winRateByEmotion[emotion] = { wins: 0, total: 0, rate: 0 };
          winRateByEmotion[emotion].total++;
          if ((r.pnlDollars ?? 0) > 0) winRateByEmotion[emotion].wins++;
        });
        Object.values(winRateByEmotion).forEach((v) => {
          v.rate = v.total > 0 ? Math.round((v.wins / v.total) * 100) : 0;
        });

        // Win rate by setup
        const winRateBySetup: Record<string, { wins: number; total: number; rate: number }> = {};
        closed.forEach((r) => {
          const setup = r.setupTag || 'untagged';
          if (!winRateBySetup[setup]) winRateBySetup[setup] = { wins: 0, total: 0, rate: 0 };
          winRateBySetup[setup].total++;
          if ((r.pnlDollars ?? 0) > 0) winRateBySetup[setup].wins++;
        });
        Object.values(winRateBySetup).forEach((v) => {
          v.rate = v.total > 0 ? Math.round((v.wins / v.total) * 100) : 0;
        });

        return {
          totalTrades,
          wins: wins.length,
          losses: losses.length,
          winRate,
          avgWinR,
          avgLossR,
          expectancy,
          profitFactor,
          totalPnlR,
          totalPnlDollars,
          largestWinR,
          largestLossR,
          currentStreak,
          equityCurveR,
          winRateByEmotion,
          winRateBySetup,
        };
      },

      clearAll: () => set({ records: [], lastLossTimestamp: null }),
    }),
    {
      name: 'nudge-trade-records',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted: any) => persisted,
    }
  )
);
