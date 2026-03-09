import { create } from 'zustand';
import { ProposedTrade, Verdict } from '../types/models';

export interface CheckedTrade {
  trade: ProposedTrade;
  verdict: Verdict;
  checkedAt: string;
}

interface TradeState {
  currentTrade: Partial<ProposedTrade> | null;
  currentVerdict: Verdict | null;

  // Checked trades — accumulate during a session, user picks which to take
  checkedTrades: CheckedTrade[];

  setTradeField: <K extends keyof ProposedTrade>(key: K, value: ProposedTrade[K]) => void;
  setCurrentTrade: (trade: Partial<ProposedTrade>) => void;
  setCurrentVerdict: (verdict: Verdict) => void;
  clearCurrent: () => void;

  addCheckedTrade: (trade: ProposedTrade, verdict: Verdict) => void;
  removeCheckedTrade: (tradeId: string) => void;
  clearCheckedTrades: () => void;
}

export const useTradeStore = create<TradeState>()((set) => ({
  currentTrade: null,
  currentVerdict: null,
  checkedTrades: [],

  setTradeField: (key, value) =>
    set((state) => ({
      currentTrade: { ...state.currentTrade, [key]: value },
    })),
  setCurrentTrade: (trade) => set({ currentTrade: trade }),
  setCurrentVerdict: (verdict) => set({ currentVerdict: verdict }),
  clearCurrent: () => set({ currentTrade: null, currentVerdict: null }),

  addCheckedTrade: (trade, verdict) =>
    set((state) => ({
      checkedTrades: [
        { trade, verdict, checkedAt: new Date().toISOString() },
        // Remove any previous check of the same ticker to avoid duplicates
        ...state.checkedTrades.filter((ct) => ct.trade.id !== trade.id),
      ],
    })),
  removeCheckedTrade: (tradeId) =>
    set((state) => ({
      checkedTrades: state.checkedTrades.filter((ct) => ct.trade.id !== tradeId),
    })),
  clearCheckedTrades: () => set({ checkedTrades: [] }),
}));
