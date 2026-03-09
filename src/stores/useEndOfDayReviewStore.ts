import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from 'expo-sqlite/kv-store';

// Inline the interface to avoid circular dependency timing issues
interface EndOfDayReview {
  id: string;
  date: string;
  plannedTrades: number;
  actualTrades: number;
  followedVerdicts: number;
  overroddenVerdicts: number;
  disciplineRating: number;
  bestDecision: string;
  worstDecision: string;
  lessonLearned: string;
  tomorrowFocus: string;
  createdAt: string;
  updatedAt: string;
}

function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

interface EndOfDayReviewState {
  reviews: EndOfDayReview[];

  // Actions
  addReview: (review: EndOfDayReview) => void;
  updateReview: (id: string, data: Partial<Omit<EndOfDayReview, 'id' | 'date' | 'createdAt'>>) => void;
  deleteReview: (id: string) => void;

  // Queries
  getTodayReview: () => EndOfDayReview | undefined;
  getReviewByDate: (date: string) => EndOfDayReview | undefined;
  getRecentReviews: (n: number) => EndOfDayReview[];
  getReviewCount: () => number;
  getAverageDisciplineRating: () => number;

  clearAll: () => void;
}

export const useEndOfDayReviewStore = create<EndOfDayReviewState>()(
  persist(
    (set, get) => ({
      reviews: [],

      addReview: (review) =>
        set((state) => ({ reviews: [review, ...state.reviews] })),

      updateReview: (id, data) =>
        set((state) => ({
          reviews: state.reviews.map((r) =>
            r.id === id
              ? { ...r, ...data, updatedAt: new Date().toISOString() }
              : r
          ),
        })),

      deleteReview: (id) =>
        set((state) => ({
          reviews: state.reviews.filter((r) => r.id !== id),
        })),

      getTodayReview: () => {
        const today = getTodayStr();
        return get().reviews.find((r) => r.date === today);
      },

      getReviewByDate: (date) =>
        get().reviews.find((r) => r.date === date),

      getRecentReviews: (n) =>
        get().reviews.slice(0, n),

      getReviewCount: () => get().reviews.length,

      getAverageDisciplineRating: () => {
        const reviews = get().reviews;
        if (reviews.length === 0) return 0;
        const sum = reviews.reduce((s, r) => s + r.disciplineRating, 0);
        return Math.round((sum / reviews.length) * 10) / 10;
      },

      clearAll: () => set({ reviews: [] }),
    }),
    {
      name: 'nudge-eod-reviews',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted: any) => persisted,
    }
  )
);
