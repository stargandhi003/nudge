import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, radii } from '../../src/theme';
import { Card, VerdictBadge } from '../../src/components/ui';
import { useAppStore } from '../../src/stores/useAppStore';
import { useUserStore } from '../../src/stores/useUserStore';
import { useRulesStore } from '../../src/stores/useRulesStore';
import { useTradeRecordStore } from '../../src/stores/useTradeRecordStore';
import { useDailyPlanStore } from '../../src/stores/useDailyPlanStore';
import { useEndOfDayReviewStore } from '../../src/stores/useEndOfDayReviewStore';
import { useStreakStore, STREAK_INFO } from '../../src/stores/useStreakStore';
import { usePasswordVaultStore } from '../../src/stores/usePasswordVaultStore';
import { EMOTION_OPTIONS, MARKET_BIAS_OPTIONS, SETUP_OPTIONS } from '../../src/types/models';
import { formatCurrency, formatPercent } from '../../src/utils/formatting';
import { format, addDays, subDays, isToday, parseISO } from 'date-fns';
import { Svg, Path, Circle } from 'react-native-svg';

// ─── Helpers ────────────────────────────────────────────────────
function toLocalDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getEmotionEmoji(tag?: string): string {
  if (!tag) return '';
  const found = EMOTION_OPTIONS.find((e) => e.value === tag);
  return found ? found.emoji : '';
}

// ─── Sub-components ─────────────────────────────────────────────

function StatCard({ label, value, subValue, color }: { label: string; value: string; subValue?: string; color?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      {subValue && <Text style={styles.statSub}>{subValue}</Text>}
    </View>
  );
}

function DisciplineRing({ score, size = 100 }: { score: number; size?: number; }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const center = size / 2;

  const ringColor = score >= 80 ? colors.verdictProceed
    : score >= 60 ? colors.verdictAdjust
    : score >= 40 ? colors.verdictWait
    : colors.verdictStop;

  return (
    <View style={[styles.ringContainer, { width: size, height: size }]} accessibilityRole="text" accessibilityLabel={`Discipline score ${score} out of 100`}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={radius} stroke={colors.surfaceHover} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={center} cy={center} r={radius}
          stroke={ringColor} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${progress} ${circumference - progress}`}
          strokeDashoffset={circumference * 0.25}
          strokeLinecap="round"
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={[styles.ringScore, { color: ringColor }]}>{score}</Text>
        <Text style={styles.ringLabel}>Discipline</Text>
      </View>
    </View>
  );
}

function StreakItem({ emoji, label, current, longest }: { emoji: string; label: string; current: number; longest: number }) {
  return (
    <View style={styles.streakItem}>
      <Text style={styles.streakEmoji}>{emoji}</Text>
      <View style={styles.streakTextCol}>
        <Text style={styles.streakLabel}>{label}</Text>
        <Text style={styles.streakSub}>Best: {longest}d</Text>
      </View>
      <View style={styles.streakCountCol}>
        <Text style={[styles.streakCount, current > 0 ? { color: colors.verdictProceed } : { color: colors.textMuted }]}>
          {current}
        </Text>
        <Text style={styles.streakDays}>day{current !== 1 ? 's' : ''}</Text>
      </View>
    </View>
  );
}

function ActiveTradeCard({ trade, onClose, onJournal }: { trade: any; onClose: () => void; onJournal: () => void }) {
  const isBuy = trade.trade.direction === 'buy';
  const hasJournal = trade.entryEmotion || trade.entryNote;

  return (
    <View style={styles.activeTradeCard}>
      <View style={styles.activeTradeTop}>
        <View style={styles.activeTradeRow}>
          <Text style={styles.activeTradeTicker}>{trade.trade.ticker}</Text>
          <View style={[styles.dirBadge, { backgroundColor: isBuy ? colors.marketUp + '18' : colors.marketDown + '18' }]}>
            <Text style={[styles.dirBadgeText, { color: isBuy ? colors.marketUp : colors.marketDown }]}>
              {isBuy ? 'BUY' : 'SELL'}
            </Text>
          </View>
          {trade.entryEmotion && (
            <Text style={styles.tradeEmoji}>{getEmotionEmoji(trade.entryEmotion)}</Text>
          )}
        </View>
        <Text style={styles.activeTradeDetail}>
          {trade.trade.quantity} @ {formatCurrency(trade.trade.entryPrice)}
        </Text>
      </View>
      <View style={styles.activeTradeActions}>
        {!hasJournal && (
          <TouchableOpacity onPress={onJournal} activeOpacity={0.7} style={styles.journalMiniBtn}>
            <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
              <Path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke={colors.primary} strokeWidth={2.5} strokeLinecap="round" />
            </Svg>
            <Text style={styles.journalMiniBtnText}>Journal</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.activeTradeClose}>Close →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────

function getTodayDateStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function dateStrToDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dateToDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const hidePnl = useAppStore((s) => s.hidePnl);
  const profile = useUserStore((s) => s.profile);
  const rules = useRulesStore((s) => s.rules);
  const {
    records,
    getActiveTrades,
    getTradesByDate,
    calculateDisciplineScore,
  } = useTradeRecordStore();
  const accountSize = profile?.accountSize ?? 0;
  const dailyPlans = useDailyPlanStore((s) => s.plans);
  const getPlanByDate = useDailyPlanStore((s) => s.getPlanByDate);
  const endOfDayReviews = useEndOfDayReviewStore((s) => s.reviews);
  const getReviewByDate = useEndOfDayReviewStore((s) => s.getReviewByDate);
  const allStreaks = useStreakStore((s) => s.getAllStreaks)();
  const activeStreakCount = useStreakStore((s) => s.getTotalActiveStreaks)();
  const vaultEnabled = usePasswordVaultStore((s) => s.vaultEnabled);
  const vaultEntries = usePasswordVaultStore((s) => s.entries);

  // ─── Vault password visibility ────────────────────────────
  const [vaultVisible, setVaultVisible] = useState<Record<string, boolean>>({});

  // ─── Date Navigation ───────────────────────────────────────
  const [selectedDateStr, setSelectedDateStr] = useState(getTodayDateStr);
  const selectedDate = dateStrToDate(selectedDateStr);
  const todayDateStr = getTodayDateStr();
  const isViewingToday = selectedDateStr === todayDateStr;

  const goBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDateStr(dateToDateStr(subDays(selectedDate, 1)));
  };

  const goForward = () => {
    if (isViewingToday) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDateStr(dateToDateStr(addDays(selectedDate, 1)));
  };

  const goToToday = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDateStr(todayDateStr);
  };

  // ─── Date-aware data (memoized) ────────────────────────────────
  const dayPlan = getPlanByDate(selectedDateStr);
  const dayReview = getReviewByDate(selectedDateStr);

  const dayTrades = useMemo(
    () => records.filter((r) => toLocalDate(r.createdAt) === selectedDateStr && r.status !== 'cancelled'),
    [records, selectedDateStr]
  );

  const dayTradeCount = useMemo(
    () => dayTrades.filter((r) => r.decision === 'followed').length,
    [dayTrades]
  );

  // Day discipline score — matches store's calculateDisciplineScore weights
  const dayDiscipline = useMemo(() => {
    if (dayTrades.length === 0) return { overall: 100, ruleAdherence: 100, journalConsistency: 100, cooldownRespect: 100, tradeLimitRespect: 100, planFollowing: 100 };
    const followed = dayTrades.filter((r) => r.decision === 'followed');
    const journaled = dayTrades.filter((r) => r.entryEmotion || r.entryNote);
    const planned = dayTrades.filter((r) => r.isPlanned);

    const cooldownTrades = dayTrades.filter((r) => r.cooldownOverride !== undefined);
    const cooldownRespected = cooldownTrades.filter((r) => !r.cooldownOverride);
    const cooldownRespect = cooldownTrades.length > 0 ? Math.round((cooldownRespected.length / cooldownTrades.length) * 100) : 100;

    const tradeLimitTrades = dayTrades.filter((r) => r.tradeLimitOverride !== undefined);
    const limitRespected = tradeLimitTrades.filter((r) => !r.tradeLimitOverride);
    const tradeLimitRespect = tradeLimitTrades.length > 0 ? Math.round((limitRespected.length / tradeLimitTrades.length) * 100) : 100;

    const ruleAdherence = Math.round((followed.length / dayTrades.length) * 100);
    const journalConsistency = Math.round((journaled.length / dayTrades.length) * 100);
    const planFollowing = Math.round((planned.length / dayTrades.length) * 100);
    const overall = Math.round(
      ruleAdherence * 0.30 +
      journalConsistency * 0.20 +
      cooldownRespect * 0.15 +
      tradeLimitRespect * 0.15 +
      planFollowing * 0.20
    );
    return { overall: Math.min(100, Math.max(0, overall)), ruleAdherence, journalConsistency, cooldownRespect, tradeLimitRespect, planFollowing };
  }, [dayTrades]);

  // Risk used for the selected day
  const { dayRiskUsed, riskUsedPercent } = useMemo(() => {
    const risk = dayTrades
      .filter((r) => r.decision === 'followed')
      .reduce((sum, r) => sum + r.trade.totalRisk, 0);
    return { dayRiskUsed: risk, riskUsedPercent: accountSize > 0 ? (risk / accountSize) * 100 : 0 };
  }, [dayTrades, accountSize]);

  // Active trades (only meaningful for today)
  const activeTrades = isViewingToday ? getActiveTrades() : [];

  // P&L for the day
  const { closedDayTrades, dayPnl, dayWins, dayLosses } = useMemo(() => {
    const closed = dayTrades.filter((r) => r.status === 'closed');
    return {
      closedDayTrades: closed,
      dayPnl: closed.reduce((sum, r) => sum + (r.pnlDollars ?? 0), 0),
      dayWins: closed.filter((r) => (r.pnlDollars ?? 0) > 0).length,
      dayLosses: closed.filter((r) => (r.pnlDollars ?? 0) < 0).length,
    };
  }, [dayTrades]);

  // Trades needing journal (only for today)
  const unjournaled = useMemo(
    () => isViewingToday ? dayTrades.filter((r) => !r.entryEmotion && !r.entryNote).slice(0, 3) : [],
    [dayTrades, isViewingToday]
  );

  const greeting = () => {
    const hour = new Date().getHours();
    const firstName = profile?.name ? `, ${profile.name}` : '';
    if (hour < 12) return `Good morning${firstName}`;
    if (hour < 17) return `Good afternoon${firstName}`;
    return `Good evening${firstName}`;
  };

  const dateLabel = isViewingToday
    ? 'Today'
    : selectedDateStr === dateToDateStr(subDays(new Date(), 1))
    ? 'Yesterday'
    : format(selectedDate, 'EEE, MMM d');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          {isViewingToday && <Text style={styles.greeting}>{greeting()}</Text>}
          {!isViewingToday && <Text style={styles.greeting}>Review</Text>}
        </Animated.View>

        {/* Date Navigator */}
        <View style={styles.dateNav} accessibilityRole="toolbar" accessibilityLabel="Date navigation">
          <TouchableOpacity onPress={goBack} style={styles.dateNavBtn} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Previous day">
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path d="M15 18l-6-6 6-6" stroke={colors.textSecondary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
          <TouchableOpacity onPress={goToToday} activeOpacity={0.7} disabled={isViewingToday} accessibilityRole="button" accessibilityLabel={`${dateLabel}, ${format(selectedDate, 'EEEE, MMMM d')}. Double tap to go to today`}>
            <View style={styles.dateNavCenter}>
              <Text style={[styles.dateNavLabel, isViewingToday && { color: colors.primary }]}>{dateLabel}</Text>
              <Text style={styles.dateNavFull}>{format(selectedDate, 'EEEE, MMMM d')}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={goForward}
            style={[styles.dateNavBtn, isViewingToday && { opacity: 0.25 }]}
            activeOpacity={0.7}
            disabled={isViewingToday}
            accessibilityRole="button"
            accessibilityLabel="Next day"
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path d="M9 18l6-6-6-6" stroke={colors.textSecondary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
        </View>

        {/* Daily Plan Card — only on today */}
        {isViewingToday && (
          <Animated.View entering={FadeInDown.delay(150).duration(400)}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/daily-plan')}
            >
              {dayPlan ? (
                <Card style={styles.planCard}>
                  <View style={styles.planHeader}>
                    <Text style={styles.planEmoji}>
                      {EMOTION_OPTIONS.find((e) => e.value === dayPlan.mood)?.emoji ?? '🧭'}
                    </Text>
                    <View style={styles.planHeaderText}>
                      <Text style={styles.planTitle}>Today's Plan</Text>
                      {dayPlan.marketBias && (
                        <Text style={styles.planBias}>
                          {MARKET_BIAS_OPTIONS.find((b) => b.value === dayPlan.marketBias)?.emoji}{' '}
                          {dayPlan.marketBias.charAt(0).toUpperCase() + dayPlan.marketBias.slice(1)}
                        </Text>
                      )}
                    </View>
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                      <Path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" />
                    </Svg>
                  </View>
                  {dayPlan.watchlist.filter(Boolean).length > 0 && (
                    <View style={styles.planTickers}>
                      {dayPlan.watchlist.filter(Boolean).map((t, i) => (
                        <View key={i} style={styles.planTickerChip}>
                          <Text style={styles.planTickerText}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {dayPlan.intention ? (
                    <Text style={styles.planIntention} numberOfLines={1}>"{dayPlan.intention}"</Text>
                  ) : null}
                </Card>
              ) : (
                <Card style={styles.planNudgeCard}>
                  <View style={styles.planNudgeIcon}>
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                      <Path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2V3z" stroke={colors.white} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      <Path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7V3z" stroke={colors.white} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </View>
                  <View style={styles.nudgeText}>
                    <Text style={styles.nudgeTitle}>Plan your trading day</Text>
                    <Text style={styles.nudgeDesc}>Set your mood, watchlist & intention</Text>
                  </View>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path d="M9 18l6-6-6-6" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </Card>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Broker Password Vault — only on today, only when enabled, only when plan is set */}
        {isViewingToday && vaultEnabled && vaultEntries.length > 0 && (
          <Animated.View entering={FadeInDown.delay(180).duration(400)}>
            {dayPlan ? (
              <Card style={styles.vaultCard}>
                <View style={styles.vaultCardHeader}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4" stroke={colors.verdictProceed} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                  <Text style={styles.vaultCardTitle}>Broker Access</Text>
                </View>
                {vaultEntries.map((entry) => (
                  <TouchableOpacity
                    key={entry.id}
                    style={styles.vaultCardEntry}
                    onPress={() => setVaultVisible((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.vaultCardBroker}>{entry.brokerName}</Text>
                      {entry.username ? <Text style={styles.vaultCardUser}>{entry.username}</Text> : null}
                    </View>
                    <Text style={styles.vaultCardPw}>
                      {vaultVisible[entry.id] ? entry.password : '••••••••'}
                    </Text>
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                      {vaultVisible[entry.id] ? (
                        <Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      ) : (
                        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zM12 9a3 3 0 100 6 3 3 0 000-6z" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      )}
                    </Svg>
                  </TouchableOpacity>
                ))}
              </Card>
            ) : (
              <Card style={styles.vaultLockedCard}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Path d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text style={styles.vaultLockedText}>Set your daily plan to unlock broker passwords</Text>
              </Card>
            )}
          </Animated.View>
        )}

        {/* Past Day Plan Summary (read-only) */}
        {!isViewingToday && dayPlan && (
          <Card style={styles.planCard}>
            <View style={styles.planHeader}>
              <Text style={styles.planEmoji}>
                {EMOTION_OPTIONS.find((e) => e.value === dayPlan.mood)?.emoji ?? '🧭'}
              </Text>
              <View style={styles.planHeaderText}>
                <Text style={styles.planTitle}>Day's Plan</Text>
                {dayPlan.marketBias && (
                  <Text style={styles.planBias}>
                    {MARKET_BIAS_OPTIONS.find((b) => b.value === dayPlan.marketBias)?.emoji}{' '}
                    {dayPlan.marketBias.charAt(0).toUpperCase() + dayPlan.marketBias.slice(1)}
                  </Text>
                )}
              </View>
              {dayTrades.length > 0 && (
                <View style={styles.pastDayScoreBadge}>
                  <Text style={[styles.pastDayScoreText, {
                    color: dayDiscipline.overall >= 80 ? colors.verdictProceed
                      : dayDiscipline.overall >= 60 ? colors.verdictAdjust
                      : dayDiscipline.overall >= 40 ? colors.verdictWait
                      : colors.verdictStop,
                  }]}>{dayDiscipline.overall}%</Text>
                  <Text style={styles.pastDayScoreLabel}>discipline</Text>
                </View>
              )}
            </View>
            {dayPlan.watchlist.filter(Boolean).length > 0 && (
              <View style={styles.planTickers}>
                {dayPlan.watchlist.filter(Boolean).map((t, i) => (
                  <View key={i} style={styles.planTickerChip}>
                    <Text style={styles.planTickerText}>{t}</Text>
                  </View>
                ))}
              </View>
            )}
            {dayPlan.intention ? (
              <Text style={styles.planIntention} numberOfLines={1}>"{dayPlan.intention}"</Text>
            ) : null}
          </Card>
        )}

        {/* Past Day — no plan but had trades: show discipline inline */}
        {!isViewingToday && !dayPlan && dayTrades.length > 0 && (
          <Card style={styles.pastDayDisciplineOnly}>
            <Text style={styles.pastDayDisciplineLabel}>Day's Discipline</Text>
            <Text style={[styles.pastDayDisciplineScore, {
              color: dayDiscipline.overall >= 80 ? colors.verdictProceed
                : dayDiscipline.overall >= 60 ? colors.verdictAdjust
                : dayDiscipline.overall >= 40 ? colors.verdictWait
                : colors.verdictStop,
            }]}>{dayDiscipline.overall}%</Text>
            <Text style={styles.pastDayDisciplineSub}>
              {dayTradeCount} trade{dayTradeCount !== 1 ? 's' : ''} checked · {dayDiscipline.ruleAdherence}% rules · {dayDiscipline.journalConsistency}% journaled
            </Text>
          </Card>
        )}

        {/* Discipline Score + Breakdown — only when day has trades */}
        {dayTrades.length > 0 ? (
          <Card style={styles.disciplineCard}>
            <View style={styles.disciplineRow}>
              <DisciplineRing score={dayDiscipline.overall} />
              <View style={styles.disciplineStats}>
                <View style={styles.disciplineStat}>
                  <Text style={styles.disciplineStatLabel}>Rules</Text>
                  <Text style={styles.disciplineStatValue}>{dayDiscipline.ruleAdherence}%</Text>
                </View>
                <View style={styles.disciplineStat}>
                  <Text style={styles.disciplineStatLabel}>Journal</Text>
                  <Text style={styles.disciplineStatValue}>{dayDiscipline.journalConsistency}%</Text>
                </View>
                <View style={styles.disciplineStat}>
                  <Text style={styles.disciplineStatLabel}>Planned</Text>
                  <Text style={styles.disciplineStatValue}>{dayDiscipline.planFollowing}%</Text>
                </View>
                {closedDayTrades.length > 0 && !hidePnl && (
                  <View style={styles.disciplineStat}>
                    <Text style={styles.disciplineStatLabel}>P&L</Text>
                    <Text style={[styles.disciplineStatValue, { color: dayPnl >= 0 ? colors.marketUp : colors.marketDown }]}>
                      {dayPnl >= 0 ? '+' : ''}{formatCurrency(dayPnl)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Card>
        ) : isViewingToday ? (
          <Card style={styles.disciplineCard}>
            <View style={styles.noTradesRow}>
              <View style={styles.noTradesRing}>
                <Text style={styles.noTradesDash}>—</Text>
                <Text style={styles.noTradesRingLabel}>Discipline</Text>
              </View>
              <View style={styles.disciplineStats}>
                <Text style={styles.noDisciplineText}>Waiting for your first trade</Text>
                <Text style={styles.noDisciplineSubtext}>Run a trade check to start tracking your discipline for today</Text>
              </View>
            </View>
          </Card>
        ) : null}

        {/* EOD Review Nudge — only on today */}
        {isViewingToday && !dayReview && dayTrades.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/end-of-day-review')}
          >
            <Card style={styles.reviewNudgeCard}>
              <View style={styles.nudgeIcon}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path d="M9 11l3 3L22 4" stroke={colors.white} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke={colors.white} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>
              <View style={styles.nudgeText}>
                <Text style={styles.nudgeTitle}>Review your day</Text>
                <Text style={styles.nudgeDesc}>
                  {dayTrades.length} trade{dayTrades.length !== 1 ? 's' : ''} today — how did you do?
                </Text>
              </View>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M9 18l6-6-6-6" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Card>
          </TouchableOpacity>
        )}

        {/* Past Day Review Summary */}
        {!isViewingToday && dayReview && (
          <Card style={styles.reviewSummaryCard}>
            <View style={styles.reviewSummaryHeader}>
              <Text style={styles.reviewSummaryTitle}>Day Review</Text>
              <Text style={styles.reviewSummaryRating}>{dayReview.disciplineRating}/5</Text>
            </View>
            {dayReview.lessonLearned ? (
              <Text style={styles.reviewSummaryLesson}>"{dayReview.lessonLearned}"</Text>
            ) : null}
          </Card>
        )}

        {/* Stats Row — show when viewing today or when there are trades */}
        {(isViewingToday || dayTrades.length > 0) && <View style={styles.statsRow}>
          <StatCard
            label="Risk Used"
            value={formatPercent(riskUsedPercent)}
            subValue={`of ${formatPercent(rules.dailyLossLimit)} limit`}
            color={riskUsedPercent > rules.dailyLossLimit * 0.8 ? colors.verdictWait : colors.verdictProceed}
          />
          <StatCard
            label="Trades"
            value={`${dayTradeCount}`}
            subValue={`of ${rules.dailyTradeLimit} limit`}
            color={dayTradeCount >= rules.dailyTradeLimit ? colors.verdictStop : colors.textPrimary}
          />
          <StatCard
            label={isViewingToday ? 'Positions' : 'W / L'}
            value={isViewingToday ? `${activeTrades.length}` : `${dayWins} / ${dayLosses}`}
            subValue={isViewingToday ? `of ${rules.maxOpenPositions} max` : `${closedDayTrades.length} closed`}
          />
        </View>}

        {/* Process Streaks */}
        <Card style={styles.streaksCard}>
          <View style={styles.streaksHeader}>
            <Text style={styles.streaksTitle}>Process Streaks</Text>
            <View style={styles.activeStreaksBadge}>
              <Text style={styles.activeStreaksText}>{activeStreakCount}/5 active</Text>
            </View>
          </View>
          {STREAK_INFO.map((info) => {
            const s = allStreaks[info.type] || { currentStreak: 0, longestStreak: 0 };
            return (
              <StreakItem
                key={info.type}
                emoji={info.emoji}
                label={info.label}
                current={s.currentStreak}
                longest={s.longestStreak}
              />
            );
          })}
        </Card>

        {/* Journal Nudge — only on today */}
        {unjournaled.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/journal')}
          >
            <Card style={styles.nudgeCard}>
              <View style={styles.nudgeIcon}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke={colors.white} strokeWidth={2} strokeLinecap="round" />
                </Svg>
              </View>
              <View style={styles.nudgeText}>
                <Text style={styles.nudgeTitle}>
                  {unjournaled.length} trade{unjournaled.length !== 1 ? 's' : ''} need journaling
                </Text>
                <Text style={styles.nudgeDesc}>
                  {unjournaled.map((t) => t.trade.ticker).join(', ')} — add how you felt
                </Text>
              </View>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M9 18l6-6-6-6" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Card>
          </TouchableOpacity>
        )}

        {/* Active Trades — only on today */}
        {activeTrades.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Trades</Text>
              <Text style={styles.sectionCount}>{activeTrades.length}</Text>
            </View>
            <View style={styles.activeTradeList}>
              {activeTrades.slice(0, 5).map((trade) => (
                <ActiveTradeCard
                  key={trade.id}
                  trade={trade}
                  onClose={() => router.push({
                    pathname: '/checkpoint/close-trade',
                    params: { id: trade.id },
                  })}
                  onJournal={() => router.push('/(tabs)/journal')}
                />
              ))}
            </View>
          </>
        )}

        {/* Day's Trades — for past days, show full trade cards */}
        {!isViewingToday && dayTrades.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Trades</Text>
              <Text style={styles.sectionCount}>
                {dayTrades.length} trade{dayTrades.length !== 1 ? 's' : ''}
                {closedDayTrades.length > 0 && ` · ${dayWins}W ${dayLosses}L`}
              </Text>
            </View>
            <View style={styles.pastTradeList}>
              {dayTrades.map((entry) => {
                const isBuy = entry.trade.direction === 'buy';
                const isClosed = entry.status === 'closed';
                const pnl = entry.pnlDollars ?? 0;
                const hasJournal = entry.entryEmotion || entry.setupTag || entry.entryNote;
                return (
                  <Card key={entry.id} style={styles.pastTradeCard}>
                    {/* Top row: ticker + badges + P&L */}
                    <View style={styles.pastTradeTop}>
                      <View style={styles.pastTradeLeft}>
                        <Text style={styles.pastTradeTicker}>{entry.trade.ticker}</Text>
                        <View style={[styles.pastDirBadge, { backgroundColor: isBuy ? colors.marketUp + '18' : colors.marketDown + '18' }]}>
                          <Text style={[styles.pastDirText, { color: isBuy ? colors.marketUp : colors.marketDown }]}>
                            {isBuy ? 'BUY' : 'SELL'}
                          </Text>
                        </View>
                        <VerdictBadge level={entry.verdict.level} size="sm" />
                      </View>
                      {isClosed && !hidePnl && (
                        <Text style={[styles.pastTradePnl, { color: pnl >= 0 ? colors.marketUp : colors.marketDown }]}>
                          {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                        </Text>
                      )}
                      {entry.status === 'active' && (
                        <View style={styles.pastActiveBadge}>
                          <View style={styles.pastActiveDot} />
                          <Text style={styles.pastActiveText}>Active</Text>
                        </View>
                      )}
                    </View>
                    {/* Details row */}
                    <View style={styles.pastTradeBottom}>
                      <View style={[styles.pastPlannedChip, { backgroundColor: entry.isPlanned ? colors.primary + '18' : colors.verdictWait + '18' }]}>
                        <Text style={[styles.pastPlannedText, { color: entry.isPlanned ? colors.primary : colors.verdictWait }]}>
                          {entry.isPlanned ? 'Planned' : 'Unplanned'}
                        </Text>
                      </View>
                      <Text style={styles.pastTradeDetail}>
                        {entry.trade.quantity} @ {formatCurrency(entry.trade.entryPrice)}
                      </Text>
                      {isClosed && entry.pnlR !== undefined && !hidePnl && (
                        <Text style={[styles.pastTradeR, { color: entry.pnlR >= 0 ? colors.marketUp : colors.marketDown }]}>
                          {entry.pnlR >= 0 ? '+' : ''}{entry.pnlR.toFixed(1)}R
                        </Text>
                      )}
                    </View>
                    {/* Journal tags */}
                    {hasJournal && (
                      <View style={styles.pastJournalRow}>
                        {entry.entryEmotion && (
                          <View style={styles.pastJournalTag}>
                            <Text style={styles.pastJournalEmoji}>{getEmotionEmoji(entry.entryEmotion)}</Text>
                          </View>
                        )}
                        {entry.setupTag && (
                          <View style={styles.pastJournalTag}>
                            <Text style={styles.pastJournalTagText}>
                              {SETUP_OPTIONS?.find((s: any) => s.value === entry.setupTag)?.label || entry.setupTag}
                            </Text>
                          </View>
                        )}
                        {entry.entryNote && (
                          <Text style={styles.pastJournalNote} numberOfLines={1}>"{entry.entryNote}"</Text>
                        )}
                      </View>
                    )}
                  </Card>
                );
              })}
            </View>
          </>
        )}

        {/* Recent Activity — only on today */}
        {isViewingToday && dayTrades.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/journal')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.recentList}>
              {dayTrades.slice(0, 5).map((entry) => (
                <Card key={entry.id} style={styles.recentCard}>
                  <View style={styles.recentRow}>
                    <View style={styles.recentLeft}>
                      <Text style={styles.recentTicker}>
                        {entry.trade.direction.toUpperCase()} {entry.trade.ticker}
                      </Text>
                      <Text style={styles.recentTime}>
                        {format(new Date(entry.createdAt), 'h:mm a')}
                      </Text>
                    </View>
                    <View style={styles.recentRight}>
                      {entry.entryEmotion && (
                        <Text style={styles.recentEmoji}>{getEmotionEmoji(entry.entryEmotion)}</Text>
                      )}
                      <VerdictBadge level={entry.verdict.level} size="sm" />
                      {entry.isPlanned ? (
                        <View style={styles.plannedBadge}>
                          <Text style={styles.plannedBadgeText}>P</Text>
                        </View>
                      ) : (
                        <View style={styles.unplannedBadge}>
                          <Text style={styles.unplannedBadgeText}>U</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          </>
        )}

        {/* Empty State — no trades for the selected day */}
        {dayTrades.length === 0 && (
          <Card style={styles.emptyCard}>
            {isViewingToday ? (
              <>
                <Text style={styles.emptyTitle}>No trades yet</Text>
                <Text style={styles.emptyDesc}>
                  Tap the + button to run a pre-trade check or write a journal entry.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyTitle}>No trades on this day</Text>
                <Text style={styles.emptyDesc}>
                  You didn't log any trades on {format(selectedDate, 'MMMM d')}.
                </Text>
              </>
            )}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.xl, gap: spacing.lg, paddingBottom: 100 },
  greeting: {
    fontSize: typography.xl,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  date: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },

  // Discipline Card
  disciplineCard: { paddingVertical: spacing.lg },
  disciplineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  ringContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringScore: {
    fontSize: typography.xxl,
    fontFamily: typography.bold,
  },
  ringLabel: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
    marginTop: -2,
  },
  disciplineStats: {
    flex: 1,
    gap: spacing.md,
  },
  disciplineStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  disciplineStatLabel: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },
  disciplineStatValue: {
    fontSize: typography.sm,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  statLabel: {
    fontSize: typography.xs,
    fontFamily: typography.semiBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: typography.xl,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  statSub: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },

  // Daily Plan Card (when plan exists)
  planCard: {
    gap: spacing.sm,
    backgroundColor: colors.primary + '08',
    borderColor: colors.primary + '25',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  planEmoji: { fontSize: 28 },
  planHeaderText: { flex: 1, gap: 2 },
  planTitle: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },
  planBias: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },
  planTickers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  planTickerChip: {
    backgroundColor: colors.surfaceHover,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  planTickerText: {
    fontSize: typography.xs,
    fontFamily: typography.bold,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  planIntention: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },

  // ── Vault Card (unlocked)
  vaultCard: {
    gap: spacing.sm,
    backgroundColor: colors.verdictProceed + '06',
    borderColor: colors.verdictProceed + '20',
  },
  vaultCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  vaultCardTitle: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.verdictProceed,
  },
  vaultCardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  vaultCardBroker: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },
  vaultCardUser: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },
  vaultCardPw: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    letterSpacing: 1,
    marginRight: spacing.xs,
  },
  // ── Vault Card (locked)
  vaultLockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  vaultLockedText: {
    flex: 1,
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },

  // Plan Nudge Card (when no plan exists)
  planNudgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary + '08',
    borderColor: colors.primary + '25',
  },
  planNudgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Journal Nudge Card
  nudgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.verdictAdjust + '08',
    borderColor: colors.verdictAdjust + '25',
  },
  nudgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.verdictAdjust,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nudgeText: { flex: 1, gap: 2 },
  nudgeTitle: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },
  nudgeDesc: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },

  // Sections
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: typography.base,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sectionCount: {
    fontSize: typography.sm,
    fontFamily: typography.bold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  seeAll: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },

  // Active Trades
  activeTradeList: { gap: spacing.sm },
  activeTradeCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  activeTradeTop: { gap: spacing.xs },
  activeTradeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  activeTradeTicker: {
    fontSize: typography.base,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  dirBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  dirBadgeText: {
    fontSize: 10,
    fontFamily: typography.bold,
    letterSpacing: 0.5,
  },
  tradeEmoji: {
    fontSize: 14,
  },
  activeTradeDetail: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },
  activeTradeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.lg,
  },
  journalMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.primary + '15',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  journalMiniBtnText: {
    fontSize: typography.xs,
    fontFamily: typography.semiBold,
    color: colors.primary,
  },
  activeTradeClose: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.primary,
  },

  // Recent Checks
  recentList: { gap: spacing.sm },
  recentCard: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentLeft: { flex: 1 },
  recentRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recentTicker: {
    fontSize: typography.base,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },
  recentTime: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  recentEmoji: {
    fontSize: 14,
  },
  plannedBadge: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plannedBadgeText: {
    fontSize: 9,
    fontFamily: typography.bold,
    color: colors.primary,
  },
  unplannedBadge: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: colors.verdictWait + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unplannedBadgeText: {
    fontSize: 9,
    fontFamily: typography.bold,
    color: colors.verdictWait,
  },

  // Process Streaks
  streaksCard: {
    gap: spacing.sm,
  },
  streaksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  streaksTitle: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },
  activeStreaksBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  activeStreaksText: {
    fontSize: typography.xs,
    fontFamily: typography.semiBold,
    color: colors.primary,
  },
  streakItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  streakEmoji: {
    fontSize: 18,
    width: 28,
    textAlign: 'center',
  },
  streakTextCol: {
    flex: 1,
    gap: 1,
  },
  streakLabel: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },
  streakSub: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },
  streakCountCol: {
    alignItems: 'center',
    minWidth: 40,
  },
  streakCount: {
    fontSize: typography.lg,
    fontFamily: typography.bold,
  },
  streakDays: {
    fontSize: 9,
    fontFamily: typography.regular,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },

  // Discipline empty state
  noTradesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  noTradesRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderColor: colors.surfaceHover,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noTradesDash: {
    fontSize: typography.xxl,
    fontFamily: typography.bold,
    color: colors.textMuted,
  },
  noTradesRingLabel: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
    marginTop: -2,
  },
  noDisciplineText: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textSecondary,
  },
  noDisciplineSubtext: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: spacing.xs,
  },

  // Date Navigator
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateNavCenter: {
    alignItems: 'center',
    gap: 2,
  },
  dateNavLabel: {
    fontSize: typography.base,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  dateNavFull: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },

  // Past Day Review Summary
  reviewSummaryCard: {
    gap: spacing.sm,
    backgroundColor: colors.verdictProceed + '08',
    borderColor: colors.verdictProceed + '25',
  },
  reviewSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewSummaryTitle: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },
  reviewSummaryRating: {
    fontSize: typography.sm,
    fontFamily: typography.bold,
    color: colors.verdictProceed,
  },
  reviewSummaryLesson: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  // Past Day Score Badge (in plan card header)
  pastDayScoreBadge: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pastDayScoreText: {
    fontSize: typography.md,
    fontFamily: typography.bold,
  },
  pastDayScoreLabel: {
    fontSize: 9,
    fontFamily: typography.regular,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Past Day — discipline-only card (no plan existed)
  pastDayDisciplineOnly: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  pastDayDisciplineLabel: {
    fontSize: typography.xs,
    fontFamily: typography.semiBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pastDayDisciplineScore: {
    fontSize: typography.display,
    fontFamily: typography.bold,
  },
  pastDayDisciplineSub: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },

  // Past Day Trade Cards
  pastTradeList: { gap: spacing.sm },
  pastTradeCard: { gap: spacing.sm },
  pastTradeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pastTradeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  pastTradeTicker: {
    fontSize: typography.base,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  pastDirBadge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
  },
  pastDirText: {
    fontSize: 10,
    fontFamily: typography.bold,
    letterSpacing: 0.5,
  },
  pastTradePnl: {
    fontSize: typography.base,
    fontFamily: typography.bold,
  },
  pastActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.primary + '18',
  },
  pastActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  pastActiveText: {
    fontSize: 10,
    fontFamily: typography.semiBold,
    color: colors.primary,
  },
  pastTradeBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pastPlannedChip: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
  },
  pastPlannedText: {
    fontSize: typography.xs,
    fontFamily: typography.semiBold,
  },
  pastTradeDetail: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },
  pastTradeR: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
  },
  pastJournalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  pastJournalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHover,
  },
  pastJournalEmoji: { fontSize: 12 },
  pastJournalTagText: {
    fontSize: typography.xs,
    fontFamily: typography.semiBold,
    color: colors.textSecondary,
  },
  pastJournalNote: {
    flex: 1,
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  // EOD Review Nudge
  reviewNudgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.verdictProceed + '08',
    borderColor: colors.verdictProceed + '25',
  },

  // Empty State
  emptyCard: { alignItems: 'center', paddingVertical: spacing.xxxl },
  emptyTitle: {
    fontSize: typography.md,
    fontFamily: typography.semiBold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptyDesc: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.xl,
  },
});
