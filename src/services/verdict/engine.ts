import { generateId } from '../../utils/uuid';
import {
  ProposedTrade,
  RiskRules,
  UserProfile,
  DailyStats,
  Verdict,
  RuleEvaluation,
  PositionSizing,
  VerdictLevel,
  RuleSeverity,
} from '../../types/models';
import { VERDICT_MESSAGES } from '../../utils/constants';

export function evaluateTrade(
  trade: ProposedTrade,
  rules: RiskRules,
  profile: UserProfile,
  dailyStats: DailyStats
): Verdict {
  const evaluations: RuleEvaluation[] = [
    evaluateRiskPerTrade(trade, rules, profile),
    evaluateDailyLossLimit(trade, rules, profile, dailyStats),
    evaluateOpenPositions(rules, dailyStats),
    evaluateSectorExposure(trade, rules, profile, dailyStats),
    evaluateSingleStockAllocation(trade, rules, profile),
    evaluateStopLoss(trade),
  ];

  const positionSizing = calculatePositionSize(trade, rules, profile, dailyStats);
  const level = determineVerdictLevel(evaluations);
  const overallRiskScore = calculateRiskScore(evaluations);
  const message = generateVerdictMessage(level, evaluations);

  return {
    id: generateId(),
    tradeId: trade.id,
    level,
    overallRiskScore,
    message,
    ruleEvaluations: evaluations,
    positionSizing,
    createdAt: new Date().toISOString(),
  };
}

function evaluateRiskPerTrade(
  trade: ProposedTrade,
  rules: RiskRules,
  profile: UserProfile
): RuleEvaluation {
  const riskPerShare = Math.abs(trade.entryPrice - trade.stopLossPrice);
  const totalRisk = riskPerShare * trade.quantity;
  const riskPercent = profile.accountSize > 0 ? (totalRisk / profile.accountSize) * 100 : 0;
  const limitPercent = rules.maxRiskPerTrade;

  let severity: RuleSeverity = 'ok';
  if (riskPercent > limitPercent) severity = 'violation';
  else if (riskPercent > limitPercent * 0.8) severity = 'warning';

  return {
    ruleId: 'max_risk_per_trade',
    ruleName: 'Risk Per Trade',
    passed: riskPercent <= limitPercent,
    currentValue: Math.round(riskPercent * 100) / 100,
    limitValue: limitPercent,
    severity,
    message:
      severity === 'ok'
        ? `Risk is ${riskPercent.toFixed(1)}% — within your ${limitPercent}% limit`
        : severity === 'warning'
        ? `Risk is ${riskPercent.toFixed(1)}% — approaching your ${limitPercent}% limit`
        : `Risk is ${riskPercent.toFixed(1)}% — exceeds your ${limitPercent}% limit`,
  };
}

function evaluateDailyLossLimit(
  trade: ProposedTrade,
  rules: RiskRules,
  profile: UserProfile,
  dailyStats: DailyStats
): RuleEvaluation {
  const riskPerShare = Math.abs(trade.entryPrice - trade.stopLossPrice);
  const additionalRisk = riskPerShare * trade.quantity;
  const projectedDailyRisk = dailyStats.totalRiskUsed + additionalRisk;
  const projectedPercent = profile.accountSize > 0 ? (projectedDailyRisk / profile.accountSize) * 100 : 0;
  const limitPercent = rules.dailyLossLimit;

  let severity: RuleSeverity = 'ok';
  if (projectedPercent > limitPercent) severity = 'violation';
  else if (projectedPercent > limitPercent * 0.8) severity = 'warning';

  return {
    ruleId: 'daily_loss_limit',
    ruleName: 'Daily Loss Limit',
    passed: projectedPercent <= limitPercent,
    currentValue: Math.round(projectedPercent * 100) / 100,
    limitValue: limitPercent,
    severity,
    message:
      severity === 'ok'
        ? `Daily risk at ${projectedPercent.toFixed(1)}% — within your ${limitPercent}% limit`
        : severity === 'warning'
        ? `Daily risk at ${projectedPercent.toFixed(1)}% — close to your ${limitPercent}% limit`
        : `Daily risk at ${projectedPercent.toFixed(1)}% — exceeds your ${limitPercent}% daily limit`,
  };
}

function evaluateOpenPositions(rules: RiskRules, dailyStats: DailyStats): RuleEvaluation {
  const projectedOpen = dailyStats.openPositionCount + 1;
  const limit = rules.maxOpenPositions;

  let severity: RuleSeverity = 'ok';
  if (projectedOpen > limit) severity = 'violation';
  else if (projectedOpen >= limit) severity = 'warning';

  return {
    ruleId: 'max_open_positions',
    ruleName: 'Open Positions',
    passed: projectedOpen <= limit,
    currentValue: projectedOpen,
    limitValue: limit,
    severity,
    message:
      severity === 'ok'
        ? `${projectedOpen} of ${limit} positions — room available`
        : severity === 'warning'
        ? `${projectedOpen} of ${limit} positions — at your limit`
        : `${projectedOpen} positions — exceeds your ${limit} position limit`,
  };
}

function evaluateSectorExposure(
  trade: ProposedTrade,
  rules: RiskRules,
  profile: UserProfile,
  dailyStats: DailyStats
): RuleEvaluation {
  const sector = trade.sector || 'Unknown';
  const currentSectorPercent = dailyStats.sectorExposure[sector] || 0;
  const tradeAllocationPercent = profile.accountSize > 0 ? (trade.totalCost / profile.accountSize) * 100 : 0;
  const projectedExposure = currentSectorPercent + tradeAllocationPercent;
  const limitPercent = rules.maxSectorExposure;

  let severity: RuleSeverity = 'ok';
  if (projectedExposure > limitPercent) severity = 'violation';
  else if (projectedExposure > limitPercent * 0.8) severity = 'warning';

  return {
    ruleId: 'max_sector_exposure',
    ruleName: 'Sector Exposure',
    passed: projectedExposure <= limitPercent,
    currentValue: Math.round(projectedExposure * 100) / 100,
    limitValue: limitPercent,
    severity,
    message:
      severity === 'ok'
        ? `${sector} at ${projectedExposure.toFixed(1)}% — within ${limitPercent}% limit`
        : severity === 'warning'
        ? `${sector} at ${projectedExposure.toFixed(1)}% — approaching ${limitPercent}% limit`
        : `${sector} at ${projectedExposure.toFixed(1)}% — exceeds ${limitPercent}% limit`,
  };
}

function evaluateSingleStockAllocation(
  trade: ProposedTrade,
  rules: RiskRules,
  profile: UserProfile
): RuleEvaluation {
  const allocationPercent = profile.accountSize > 0 ? (trade.totalCost / profile.accountSize) * 100 : 0;
  const limitPercent = rules.maxSingleStockAllocation;

  let severity: RuleSeverity = 'ok';
  if (allocationPercent > limitPercent) severity = 'violation';
  else if (allocationPercent > limitPercent * 0.8) severity = 'warning';

  return {
    ruleId: 'max_single_stock',
    ruleName: 'Single Stock Allocation',
    passed: allocationPercent <= limitPercent,
    currentValue: Math.round(allocationPercent * 100) / 100,
    limitValue: limitPercent,
    severity,
    message:
      severity === 'ok'
        ? `${trade.ticker} allocation at ${allocationPercent.toFixed(1)}% — within ${limitPercent}% limit`
        : severity === 'warning'
        ? `${trade.ticker} allocation at ${allocationPercent.toFixed(1)}% — approaching ${limitPercent}% limit`
        : `${trade.ticker} allocation at ${allocationPercent.toFixed(1)}% — exceeds ${limitPercent}% limit`,
  };
}

function evaluateStopLoss(trade: ProposedTrade): RuleEvaluation {
  const hasStopLoss =
    trade.stopLossPrice > 0 && trade.stopLossPrice !== trade.entryPrice;

  return {
    ruleId: 'stop_loss',
    ruleName: 'Stop Loss Set',
    passed: hasStopLoss,
    currentValue: hasStopLoss ? 1 : 0,
    limitValue: 1,
    severity: hasStopLoss ? 'ok' : 'violation',
    message: hasStopLoss
      ? 'Stop loss is set — risk is defined'
      : 'No stop loss — your risk is undefined',
  };
}

function determineVerdictLevel(evaluations: RuleEvaluation[]): VerdictLevel {
  const violations = evaluations.filter((e) => e.severity === 'violation');
  const warnings = evaluations.filter((e) => e.severity === 'warning');

  if (
    violations.some((v) => v.ruleId === 'daily_loss_limit') ||
    violations.length >= 2
  ) {
    return 'stop';
  }

  if (violations.length === 1) {
    return 'wait';
  }

  if (
    warnings.length >= 2 ||
    warnings.some((w) =>
      ['max_risk_per_trade', 'daily_loss_limit'].includes(w.ruleId)
    )
  ) {
    return 'adjust';
  }

  return 'proceed';
}

function calculateRiskScore(evaluations: RuleEvaluation[]): number {
  let totalScore = 0;
  let scoredRules = 0;

  for (const evaluation of evaluations) {
    if (evaluation.limitValue === 0) continue;
    const usage = evaluation.currentValue / evaluation.limitValue;
    totalScore += Math.min(usage * 100, 100);
    scoredRules++;
  }

  if (scoredRules === 0) return 0;

  const avgScore = totalScore / scoredRules;
  const violationCount = evaluations.filter((e) => e.severity === 'violation').length;
  return Math.min(Math.round(avgScore + violationCount * 15), 100);
}

function generateVerdictMessage(
  level: VerdictLevel,
  evaluations: RuleEvaluation[]
): string {
  const violations = evaluations.filter((e) => e.severity === 'violation');

  if (level === 'stop' && violations.length > 0) {
    return `${violations[0].message}. Do not proceed.`;
  }

  if (level === 'wait' && violations.length > 0) {
    return `${violations[0].message}. Consider waiting.`;
  }

  return VERDICT_MESSAGES[level];
}

export function calculatePositionSize(
  trade: ProposedTrade,
  rules: RiskRules,
  profile: UserProfile,
  dailyStats: DailyStats
): PositionSizing {
  const accountSize = profile.accountSize;
  const maxRiskDollars = (rules.maxRiskPerTrade / 100) * accountSize;
  const riskPerShare = Math.abs(trade.entryPrice - trade.stopLossPrice);

  if (riskPerShare === 0) {
    return {
      recommendedShares: 0,
      recommendedDollarAmount: 0,
      riskAmount: 0,
      riskPercent: 0,
      riskRewardRatio: 0,
      adjustedForExposure: false,
    };
  }

  let recommendedShares = Math.floor(maxRiskDollars / riskPerShare);
  const originalShares = recommendedShares;
  let adjustedForExposure = false;
  let adjustmentReason: string | undefined;

  // Constraint: single stock allocation
  const maxAllocationDollars = (rules.maxSingleStockAllocation / 100) * accountSize;
  const maxSharesByAllocation = Math.floor(maxAllocationDollars / trade.entryPrice);
  if (recommendedShares > maxSharesByAllocation) {
    recommendedShares = maxSharesByAllocation;
    adjustedForExposure = true;
    adjustmentReason = `Reduced to stay within ${rules.maxSingleStockAllocation}% single stock limit`;
  }

  // Constraint: sector exposure
  const sector = trade.sector || 'Unknown';
  const currentSectorDollars = ((dailyStats.sectorExposure[sector] || 0) / 100) * accountSize;
  const maxSectorDollars = (rules.maxSectorExposure / 100) * accountSize;
  const availableSectorDollars = Math.max(0, maxSectorDollars - currentSectorDollars);
  const maxSharesBySector = Math.floor(availableSectorDollars / trade.entryPrice);
  if (recommendedShares > maxSharesBySector) {
    recommendedShares = maxSharesBySector;
    adjustedForExposure = true;
    adjustmentReason = `Reduced due to ${sector} sector exposure`;
  }

  // Constraint: remaining daily risk
  const maxDailyRiskDollars = (rules.dailyLossLimit / 100) * accountSize;
  const remainingDailyRisk = Math.max(0, maxDailyRiskDollars - dailyStats.totalRiskUsed);
  const maxSharesByDailyRisk = Math.floor(remainingDailyRisk / riskPerShare);
  if (recommendedShares > maxSharesByDailyRisk) {
    recommendedShares = maxSharesByDailyRisk;
    adjustedForExposure = true;
    adjustmentReason = `Reduced to stay within remaining daily risk budget`;
  }

  recommendedShares = Math.max(0, recommendedShares);

  const recommendedDollarAmount = recommendedShares * trade.entryPrice;
  const riskAmount = recommendedShares * riskPerShare;
  const riskPercent = accountSize > 0 ? (riskAmount / accountSize) * 100 : 0;

  let riskRewardRatio = 0;
  if (trade.takeProfitPrice && trade.takeProfitPrice !== trade.entryPrice) {
    const rewardPerShare = Math.abs(trade.takeProfitPrice - trade.entryPrice);
    riskRewardRatio = Math.round((rewardPerShare / riskPerShare) * 100) / 100;
  }

  return {
    recommendedShares,
    recommendedDollarAmount: Math.round(recommendedDollarAmount * 100) / 100,
    riskAmount: Math.round(riskAmount * 100) / 100,
    riskPercent: Math.round(riskPercent * 100) / 100,
    riskRewardRatio,
    adjustedForExposure,
    originalShares: adjustedForExposure ? originalShares : undefined,
    adjustmentReason,
  };
}
