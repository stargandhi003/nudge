// ─── Enums & Types ───────────────────────────────────────────────
export type TradingType = 'stocks' | 'options' | 'both';
export type TradeDirection = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop';
export type AssetType = 'stock' | 'option';
export type VerdictLevel = 'proceed' | 'adjust' | 'wait' | 'stop';
export type RuleSeverity = 'ok' | 'warning' | 'violation';

// Trade lifecycle
export type TradeStatus = 'active' | 'closed' | 'cancelled';
export type TradeOutcome = 'tp_hit' | 'sl_hit' | 'manual_exit' | 'breakeven';
export type DecisionOutcome = 'followed' | 'overrode' | 'pending';

export type OverrideReason = 'felt_confident' | 'disagreed_sizing' | 'fomo' | 'revenge' | 'news_catalyst' | 'other';

export const OVERRIDE_REASON_OPTIONS: { value: OverrideReason; label: string; emoji: string }[] = [
  { value: 'felt_confident', label: 'Felt Confident', emoji: '💪' },
  { value: 'disagreed_sizing', label: 'Disagreed w/ Sizing', emoji: '📐' },
  { value: 'fomo', label: 'FOMO', emoji: '🏃' },
  { value: 'revenge', label: 'Revenge Trade', emoji: '😤' },
  { value: 'news_catalyst', label: 'News / Catalyst', emoji: '📰' },
  { value: 'other', label: 'Other Reason', emoji: '💭' },
];

// Emotions for journaling
export type EmotionTag =
  | 'calm'
  | 'confident'
  | 'anxious'
  | 'fomo'
  | 'revenge'
  | 'bored'
  | 'frustrated'
  | 'excited'
  | 'uncertain';

export const EMOTION_OPTIONS: { value: EmotionTag; label: string; emoji: string }[] = [
  { value: 'calm', label: 'Calm', emoji: '😌' },
  { value: 'confident', label: 'Confident', emoji: '💪' },
  { value: 'anxious', label: 'Anxious', emoji: '😰' },
  { value: 'fomo', label: 'FOMO', emoji: '🏃' },
  { value: 'revenge', label: 'Revenge', emoji: '😤' },
  { value: 'bored', label: 'Bored', emoji: '🥱' },
  { value: 'frustrated', label: 'Frustrated', emoji: '😠' },
  { value: 'excited', label: 'Excited', emoji: '🔥' },
  { value: 'uncertain', label: 'Uncertain', emoji: '🤔' },
];

// Setup types for pattern tagging
export type SetupTag =
  | 'breakout'
  | 'pullback'
  | 'support_bounce'
  | 'resistance_short'
  | 'earnings'
  | 'gap_fill'
  | 'vwap_reclaim'
  | 'moving_avg'
  | 'other';

export const SETUP_OPTIONS: { value: SetupTag; label: string }[] = [
  { value: 'breakout', label: 'Breakout' },
  { value: 'pullback', label: 'Pullback' },
  { value: 'support_bounce', label: 'Support Bounce' },
  { value: 'resistance_short', label: 'Resistance Short' },
  { value: 'earnings', label: 'Earnings Play' },
  { value: 'gap_fill', label: 'Gap Fill' },
  { value: 'vwap_reclaim', label: 'VWAP Reclaim' },
  { value: 'moving_avg', label: 'Moving Avg' },
  { value: 'other', label: 'Other' },
];

// ─── User Profile ────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  name?: string;
  accountSize: number;
  tradingType: TradingType;
  broker?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Risk Rules ──────────────────────────────────────────────────
export interface RiskRules {
  maxRiskPerTrade: number;
  dailyLossLimit: number;
  maxOpenPositions: number;
  maxSectorExposure: number;
  maxSingleStockAllocation: number;
  requireStopLoss: boolean;
  // Behavioral rules
  dailyTradeLimit: number;
  cooldownDuration: number;      // minutes after a loss
  cooldownTrigger: number;       // consecutive losses to trigger
  updatedAt: string;
}

export const DEFAULT_RULES: RiskRules = {
  maxRiskPerTrade: 2,
  dailyLossLimit: 5,
  maxOpenPositions: 5,
  maxSectorExposure: 25,
  maxSingleStockAllocation: 10,
  requireStopLoss: true,
  dailyTradeLimit: 3,
  cooldownDuration: 30,
  cooldownTrigger: 2,
  updatedAt: new Date().toISOString(),
};

// ─── Watchlist ───────────────────────────────────────────────────
export interface WatchlistItem {
  id: string;
  ticker: string;
  name: string;
  assetType: AssetType;
  sector?: string;
  addedAt: string;
  optionSymbol?: string;
  strikePrice?: number;
  expirationDate?: string;
  optionType?: 'call' | 'put';
}

// ─── Proposed Trade ──────────────────────────────────────────────
export interface ProposedTrade {
  id: string;
  ticker: string;
  assetType: AssetType;
  direction: TradeDirection;
  orderType: OrderType;
  quantity: number;
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice?: number;
  limitPrice?: number;
  optionSymbol?: string;
  premiumPerContract?: number;
  totalCost: number;
  riskPerShare: number;
  totalRisk: number;
  riskPercent: number;
  sector?: string;
  createdAt: string;
}

// ─── Verdict Engine ──────────────────────────────────────────────
export interface RuleEvaluation {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  currentValue: number;
  limitValue: number;
  severity: RuleSeverity;
  message: string;
}

export interface PositionSizing {
  recommendedShares: number;
  recommendedDollarAmount: number;
  riskAmount: number;
  riskPercent: number;
  riskRewardRatio: number;
  adjustedForExposure: boolean;
  originalShares?: number;
  adjustmentReason?: string;
}

export interface Verdict {
  id: string;
  tradeId: string;
  level: VerdictLevel;
  overallRiskScore: number;
  message: string;
  ruleEvaluations: RuleEvaluation[];
  positionSizing: PositionSizing;
  createdAt: string;
}

// ─── Trade Record (Full Lifecycle) ───────────────────────────────
// The core data model — a trade from checkpoint through close
export interface TradeRecord {
  id: string;

  // Trade details (from checkpoint)
  trade: ProposedTrade;
  verdict: Verdict;

  // Decision
  decision: DecisionOutcome;
  isPlanned: boolean;              // planned (watchlist) or impulsive?

  // Journal — at entry
  entryEmotion?: EmotionTag;
  entryNote?: string;
  setupTag?: SetupTag;

  // Trade status
  status: TradeStatus;

  // Close data (filled when trade is closed)
  exitPrice?: number;
  exitDate?: string;
  tradeOutcome?: TradeOutcome;
  pnlDollars?: number;
  pnlR?: number;                   // P&L in R-multiples

  // Journal — at exit
  exitEmotion?: EmotionTag;
  exitNote?: string;

  // Behavioral flags
  cooldownOverride?: boolean;
  overrideReason?: OverrideReason;
  tradeLimitOverride?: boolean;

  // Timestamps
  createdAt: string;
  closedAt?: string;
  updatedAt: string;
}

// ─── Legacy DecisionLogEntry (backward compat) ───────────────────
export interface DecisionLogEntry {
  id: string;
  trade: ProposedTrade;
  verdict: Verdict;
  outcome: DecisionOutcome;
  actualPnL?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Daily Stats ─────────────────────────────────────────────────
export interface DailyStats {
  date: string;
  totalRiskUsed: number;
  totalRiskPercent: number;
  tradesChecked: number;
  tradesExecuted: number;
  openPositionCount: number;
  openPositionTickers: string[];
  sectorExposure: Record<string, number>;
  wins: number;
  losses: number;
  totalPnlDollars: number;
  totalPnlR: number;
  cooldownsTriggered: number;
  cooldownsOverridden: number;
  tradeLimitHit: boolean;
  tradeLimitOverridden: boolean;
}

// ─── Discipline Score ────────────────────────────────────────────
export interface DisciplineScore {
  overall: number;                 // 0-100
  ruleAdherence: number;           // % trades all rules passed
  journalConsistency: number;      // % trades with journal entries
  cooldownRespect: number;         // % cooldowns completed without override
  tradeLimitRespect: number;       // % days within trade limit
  planFollowing: number;           // % planned trades (vs impulsive)
  calculatedAt: string;
}

// ─── Standalone Journal Entry ─────────────────────────────────────
// For daily reflections, market observations, and notes not tied to a specific trade
export type JournalCategory = 'reflection' | 'market_observation' | 'lesson_learned' | 'goal' | 'free_note';

export const JOURNAL_CATEGORY_OPTIONS: { value: JournalCategory; label: string; emoji: string }[] = [
  { value: 'reflection', label: 'Reflection', emoji: '🪞' },
  { value: 'market_observation', label: 'Market', emoji: '📊' },
  { value: 'lesson_learned', label: 'Lesson', emoji: '💡' },
  { value: 'goal', label: 'Goal', emoji: '🎯' },
  { value: 'free_note', label: 'Note', emoji: '📝' },
];

export interface JournalEntry {
  id: string;
  category: JournalCategory;
  title: string;
  content: string;
  emotion?: EmotionTag;
  // Optional link to a trade record
  tradeRecordId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Calendar Day Summary ────────────────────────────────────────
export interface CalendarDaySummary {
  date: string;
  totalTrades: number;
  wins: number;
  losses: number;
  pnlDollars: number;
  pnlR: number;
  plannedTrades: number;
  unplannedTrades: number;
  disciplineScore: number;
  verdicts: Record<VerdictLevel, number>;
}

// ─── Daily Plan (Plan → Execute → Reflect) ──────────────────────
export type MarketBias = 'bullish' | 'bearish' | 'neutral';

export const MARKET_BIAS_OPTIONS: { value: MarketBias; label: string; emoji: string }[] = [
  { value: 'bullish', label: 'Bullish', emoji: '🟢' },
  { value: 'bearish', label: 'Bearish', emoji: '🔴' },
  { value: 'neutral', label: 'Neutral', emoji: '⚪' },
];

export interface DailyPlan {
  id: string;
  date: string;              // YYYY-MM-DD local date
  mood: EmotionTag;
  marketBias?: MarketBias;
  watchlist: string[];        // Up to 5 ticker symbols
  intention: string;          // Max 140 chars, daily goal
  createdAt: string;
  updatedAt: string;
}

// ─── End-of-Day Review ──────────────────────────────────────────
export interface EndOfDayReview {
  id: string;
  date: string;              // YYYY-MM-DD local date
  // Plan adherence
  plannedTrades: number;     // from today's plan
  actualTrades: number;      // what actually happened
  followedVerdicts: number;  // how many verdicts were followed
  overroddenVerdicts: number; // how many were overridden
  // Self-assessment
  disciplineRating: number;  // 1-5 self-rated
  bestDecision: string;      // what went well
  worstDecision: string;     // what to improve
  lessonLearned: string;     // key takeaway
  // Commitment for tomorrow
  tomorrowFocus: string;     // what to focus on next session
  createdAt: string;
  updatedAt: string;
}

// ─── Process Streaks ────────────────────────────────────────────
export interface ProcessStreak {
  type: 'plan' | 'journal' | 'review' | 'follow_verdict' | 'within_trade_limit';
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string;  // YYYY-MM-DD
}
