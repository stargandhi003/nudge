import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radii } from '../../src/theme';
import { Card } from '../../src/components/ui';
import { useTradeRecordStore } from '../../src/stores/useTradeRecordStore';
import { EMOTION_OPTIONS, SETUP_OPTIONS } from '../../src/types/models';
import { formatCurrency, formatPercent } from '../../src/utils/formatting';
import { Svg, Polyline, Line, Text as SvgText } from 'react-native-svg';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_PADDING = spacing.xl;
const CHART_WIDTH = SCREEN_WIDTH - CHART_PADDING * 2 - spacing.xl * 2; // account for card padding
const CHART_HEIGHT = 160;

// ─── Helpers ──────────────────────────────────────────────────────

function getEmotionDisplay(key: string): { emoji: string; label: string } {
  const found = EMOTION_OPTIONS.find((e) => e.value === key);
  if (found) return { emoji: found.emoji, label: found.label };
  return { emoji: '❓', label: key === 'untagged' ? 'Untagged' : key };
}

function getSetupDisplay(key: string): string {
  const found = SETUP_OPTIONS.find((s) => s.value === key);
  if (found) return found.label;
  return key === 'untagged' ? 'Untagged' : key;
}

function formatR(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}R`;
}

function formatStreakLabel(streak: number): string {
  if (streak === 0) return 'None';
  if (streak > 0) return `${streak}W`;
  return `${Math.abs(streak)}L`;
}

// ─── Hero Stat Card ───────────────────────────────────────────────

function HeroStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.heroCard}>
      <Text style={styles.heroLabel}>{label}</Text>
      <Text style={[styles.heroValue, { color }]}>{value}</Text>
    </View>
  );
}

// ─── Horizontal Bar ───────────────────────────────────────────────

function WinRateBar({
  label,
  emoji,
  rate,
  total,
}: {
  label: string;
  emoji?: string;
  rate: number;
  total: number;
}) {
  const barColor = rate >= 50 ? colors.marketUp : colors.marketDown;
  const barWidth = Math.max(rate, 2); // minimum visible width

  return (
    <View style={styles.barRow}>
      <View style={styles.barLabelContainer}>
        {emoji ? (
          <Text style={styles.barEmoji}>{emoji}</Text>
        ) : null}
        <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${barWidth}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={[styles.barPercent, { color: barColor }]}>{rate}%</Text>
      <Text style={styles.barCount}>({total})</Text>
    </View>
  );
}

// ─── Equity Curve Chart ───────────────────────────────────────────

function EquityCurve({ data }: { data: number[] }) {
  if (data.length === 0) {
    return (
      <View style={styles.chartEmpty}>
        <Text style={styles.chartEmptyText}>No equity data yet</Text>
      </View>
    );
  }

  const allValues = [0, ...data];
  const minR = Math.min(...allValues);
  const maxR = Math.max(...allValues);
  const range = maxR - minR || 1;
  const paddingY = 20;
  const plotHeight = CHART_HEIGHT - paddingY * 2;
  const plotWidth = CHART_WIDTH;

  const toX = (i: number) => {
    if (data.length === 1) return plotWidth / 2;
    return (i / (data.length - 1)) * plotWidth;
  };

  const toY = (val: number) => {
    return paddingY + plotHeight - ((val - minR) / range) * plotHeight;
  };

  const zeroY = toY(0);
  const lastValue = data[data.length - 1];
  const lineColor = lastValue >= 0 ? colors.marketUp : colors.marketDown;

  const points = data.map((val, i) => `${toX(i).toFixed(1)},${toY(val).toFixed(1)}`).join(' ');

  // Filled area polygon: line path, then come down to bottom and back
  const areaPoints =
    data.map((val, i) => `${toX(i).toFixed(1)},${toY(val).toFixed(1)}`).join(' ') +
    ` ${toX(data.length - 1).toFixed(1)},${zeroY.toFixed(1)}` +
    ` ${toX(0).toFixed(1)},${zeroY.toFixed(1)}`;

  // Axis labels
  const yLabels: { value: number; y: number }[] = [];
  const step = range / 4;
  for (let i = 0; i <= 4; i++) {
    const val = minR + step * i;
    yLabels.push({ value: Math.round(val * 100) / 100, y: toY(val) });
  }

  return (
    <Svg width={plotWidth} height={CHART_HEIGHT}>
      {/* Y-axis labels */}
      {yLabels.map((yl, i) => (
        <SvgText
          key={i}
          x={0}
          y={yl.y + 4}
          fontSize={9}
          fill={colors.textMuted}
          textAnchor="start"
        >
          {yl.value.toFixed(1)}
        </SvgText>
      ))}

      {/* Zero line (dashed) */}
      <Line
        x1={0}
        y1={zeroY}
        x2={plotWidth}
        y2={zeroY}
        stroke={colors.textMuted}
        strokeWidth={1}
        strokeDasharray="4,4"
        opacity={0.5}
      />

      {/* Area fill */}
      <Polyline
        points={areaPoints}
        fill={lineColor}
        fillOpacity={0.1}
        stroke="none"
      />

      {/* Line */}
      <Polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── Key Metric Row ───────────────────────────────────────────────

function MetricRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, color ? { color } : undefined]}>{value}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────

export default function PerformanceScreen() {
  const getPerformanceStats = useTradeRecordStore((s) => s.getPerformanceStats);
  const stats = useMemo(() => getPerformanceStats(), [getPerformanceStats]);

  const {
    totalTrades,
    wins,
    losses,
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
  } = stats;

  // Sort emotions by total trades descending
  const emotionEntries = useMemo(
    () =>
      Object.entries(winRateByEmotion)
        .sort((a, b) => b[1].total - a[1].total),
    [winRateByEmotion]
  );

  // Sort setups by total trades descending
  const setupEntries = useMemo(
    () =>
      Object.entries(winRateBySetup)
        .sort((a, b) => b[1].total - a[1].total),
    [winRateBySetup]
  );

  const pnlColor = totalPnlDollars >= 0 ? colors.marketUp : colors.marketDown;
  const winRateColor = winRate >= 50 ? colors.marketUp : colors.marketDown;
  const expectancyColor = expectancy >= 0 ? colors.marketUp : colors.marketDown;
  const profitFactorColor = profitFactor >= 1 ? colors.marketUp : colors.marketDown;
  const streakColor =
    currentStreak > 0 ? colors.marketUp : currentStreak < 0 ? colors.marketDown : colors.textSecondary;

  if (totalTrades === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Performance</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No data yet</Text>
          <Text style={styles.emptyDesc}>
            Complete trades to see performance analytics
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Performance</Text>
        </View>

        {/* Hero Stats Row */}
        <View style={styles.heroRow}>
          <HeroStat
            label="Win Rate"
            value={`${winRate}%`}
            color={winRateColor}
          />
          <HeroStat
            label="Expectancy"
            value={`${expectancy >= 0 ? '+' : ''}${expectancy.toFixed(2)}R`}
            color={expectancyColor}
          />
          <HeroStat
            label="Profit Factor"
            value={profitFactor.toFixed(2)}
            color={profitFactorColor}
          />
        </View>

        {/* P&L Summary Card */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>P&L Summary</Text>
          <View style={styles.pnlHero}>
            <Text style={[styles.pnlDollars, { color: pnlColor }]}>
              {totalPnlDollars >= 0 ? '+' : ''}{formatCurrency(Math.abs(totalPnlDollars))}
            </Text>
            <Text style={[styles.pnlR, { color: pnlColor }]}>
              {formatR(totalPnlR)}
            </Text>
          </View>
          <View style={styles.pnlBreakdownRow}>
            <View style={styles.pnlBreakdownItem}>
              <Text style={styles.pnlBreakdownValue}>{totalTrades}</Text>
              <Text style={styles.pnlBreakdownLabel}>Total</Text>
            </View>
            <View style={styles.pnlBreakdownItem}>
              <Text style={[styles.pnlBreakdownValue, { color: colors.marketUp }]}>{wins}</Text>
              <Text style={styles.pnlBreakdownLabel}>Wins</Text>
            </View>
            <View style={styles.pnlBreakdownItem}>
              <Text style={[styles.pnlBreakdownValue, { color: colors.marketDown }]}>{losses}</Text>
              <Text style={styles.pnlBreakdownLabel}>Losses</Text>
            </View>
          </View>
        </Card>

        {/* Equity Curve */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Equity Curve (R)</Text>
          <View style={styles.chartContainer}>
            <EquityCurve data={equityCurveR} />
          </View>
          <View style={styles.chartAxisRow}>
            <Text style={styles.chartAxisLabel}>Trade #1</Text>
            <Text style={styles.chartAxisLabel}>Trade #{equityCurveR.length}</Text>
          </View>
        </Card>

        {/* Win Rate by Emotion */}
        {emotionEntries.length > 0 && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Win Rate by Emotion</Text>
            <View style={styles.barsContainer}>
              {emotionEntries.map(([key, data]) => {
                const display = getEmotionDisplay(key);
                return (
                  <WinRateBar
                    key={key}
                    emoji={display.emoji}
                    label={display.label}
                    rate={data.rate}
                    total={data.total}
                  />
                );
              })}
            </View>
          </Card>
        )}

        {/* Win Rate by Setup */}
        {setupEntries.length > 0 && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Win Rate by Setup</Text>
            <View style={styles.barsContainer}>
              {setupEntries.map(([key, data]) => {
                const label = getSetupDisplay(key);
                return (
                  <WinRateBar
                    key={key}
                    label={label}
                    rate={data.rate}
                    total={data.total}
                  />
                );
              })}
            </View>
          </Card>
        )}

        {/* Key Metrics */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.metricsContainer}>
            <MetricRow
              label="Avg Winner"
              value={formatR(avgWinR)}
              color={colors.marketUp}
            />
            <MetricRow
              label="Avg Loser"
              value={formatR(avgLossR)}
              color={colors.marketDown}
            />
            <MetricRow
              label="Largest Win"
              value={formatR(largestWinR)}
              color={colors.marketUp}
            />
            <MetricRow
              label="Largest Loss"
              value={formatR(largestLossR)}
              color={colors.marketDown}
            />
            <MetricRow
              label="Current Streak"
              value={formatStreakLabel(currentStreak)}
              color={streakColor}
            />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: typography.xl,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },

  // ─── Empty State ────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingTop: 120,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.md,
    fontFamily: typography.semiBold,
    color: colors.textSecondary,
  },
  emptyDesc: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xxl,
  },

  // ─── Hero Stats ─────────────────────────────────────────────────
  heroRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  heroCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroLabel: {
    fontSize: typography.xs,
    fontFamily: typography.semiBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroValue: {
    fontSize: typography.xxl,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },

  // ─── Section Card ───────────────────────────────────────────────
  sectionCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // ─── P&L Summary ───────────────────────────────────────────────
  pnlHero: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  pnlDollars: {
    fontSize: typography.display,
    fontFamily: typography.bold,
  },
  pnlR: {
    fontSize: typography.md,
    fontFamily: typography.semiBold,
  },
  pnlBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pnlBreakdownItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  pnlBreakdownValue: {
    fontSize: typography.lg,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  pnlBreakdownLabel: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },

  // ─── Equity Curve ──────────────────────────────────────────────
  chartContainer: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    padding: spacing.md,
  },
  chartEmpty: {
    height: CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartEmptyText: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },
  chartAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  chartAxisLabel: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },

  // ─── Win Rate Bars ─────────────────────────────────────────────
  barsContainer: {
    gap: spacing.md,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  barLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
    gap: spacing.xs,
  },
  barEmoji: {
    fontSize: 16,
  },
  barLabel: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surfaceHover,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  barPercent: {
    fontSize: typography.sm,
    fontFamily: typography.bold,
    width: 40,
    textAlign: 'right',
  },
  barCount: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
    width: 30,
    textAlign: 'right',
  },

  // ─── Key Metrics ───────────────────────────────────────────────
  metricsContainer: {
    gap: spacing.md,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  metricLabel: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  metricValue: {
    fontSize: typography.base,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
});
