export const ACCOUNT_SIZE_PRESETS = [5000, 10000, 25000, 50000, 100000];

export const RULE_LIMITS = {
  maxRiskPerTrade: { min: 0.5, max: 5, step: 0.5, default: 2 },
  dailyLossLimit: { min: 1, max: 10, step: 0.5, default: 5 },
  maxOpenPositions: { min: 1, max: 20, step: 1, default: 5 },
  maxSectorExposure: { min: 10, max: 50, step: 5, default: 25 },
  maxSingleStockAllocation: { min: 5, max: 30, step: 5, default: 10 },
  dailyTradeLimit: { min: 1, max: 10, step: 1, default: 3 },
  cooldownDuration: { min: 5, max: 120, step: 5, default: 30 },
  cooldownTrigger: { min: 1, max: 5, step: 1, default: 2 },
};

export const VERDICT_MESSAGES = {
  proceed: 'This trade fits your rules. You\'re good to go.',
  adjust: 'Consider adjusting this trade to better fit your risk rules.',
  wait: 'This trade violates one of your rules. Consider waiting.',
  stop: 'This trade significantly exceeds your risk limits. Do not proceed.',
};
