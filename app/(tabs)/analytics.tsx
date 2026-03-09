import { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Svg, Path, Circle as SvgCircle, Polyline, Line, Text as SvgText } from 'react-native-svg';
import { colors, typography, spacing, radii } from '../../src/theme';
import { Card } from '../../src/components/ui';
import { useAppStore } from '../../src/stores/useAppStore';
import { useTradeRecordStore } from '../../src/stores/useTradeRecordStore';
import { CalendarDaySummary, TradeRecord, EMOTION_OPTIONS, SETUP_OPTIONS } from '../../src/types/models';
import { formatCurrency } from '../../src/utils/formatting';

// ─── Constants ──────────────────────────────────────────────────
const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_PADDING = spacing.xl;
const CHART_WIDTH = SCREEN_WIDTH - CHART_PADDING * 2 - spacing.xl * 2;
const CHART_HEIGHT = 160;

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── Helpers ────────────────────────────────────────────────────

function getDisciplineColor(score: number): string {
  if (score >= 80) return colors.verdictProceed;
  if (score >= 60) return colors.verdictAdjust;
  if (score >= 40) return colors.verdictWait;
  return colors.verdictStop;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOffset(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getTodayString(): string {
  const now = new Date();
  return toDateString(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function getEmotionDisplay(key: string): { emoji: string; label: string } {
  const found = EMOTION_OPTIONS.find((e) => e.value === key);
  if (found) return { emoji: found.emoji, label: found.label };
  return { emoji: '', label: key === 'untagged' ? 'Untagged' : key };
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

function toLocalDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Chevron Icons ──────────────────────────────────────────────

function ChevronLeft({ color = colors.textPrimary }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronRight({ color = colors.textPrimary }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Discipline Ring (100px hero) ───────────────────────────────

function DisciplineRing({ score, size = 100 }: { score: number; size?: number }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const center = size / 2;
  const ringColor = getDisciplineColor(score);

  return (
    <View style={[styles.ringContainer, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <SvgCircle cx={center} cy={center} r={radius} stroke={colors.surfaceHover} strokeWidth={strokeWidth} fill="none" />
        <SvgCircle
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

// MiniDisciplineRing removed — replaced with text discipline score in cells

// ─── DayDisciplineCard (shown when a calendar day is selected) ──

function DayDisciplineCard({ summary }: { summary: CalendarDaySummary }) {
  const disciplineColor = getDisciplineColor(summary.disciplineScore);
  const size = 52;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (summary.disciplineScore / 100) * circumference;
  const center = size / 2;

  return (
    <View style={styles.dayDisciplineCard}>
      <View style={styles.dayDisciplineRow}>
        <View style={styles.dayDisciplineRingWrap}>
          <Svg width={size} height={size}>
            <SvgCircle cx={center} cy={center} r={radius} stroke={colors.surfaceHover} strokeWidth={strokeWidth} fill="none" />
            <SvgCircle
              cx={center} cy={center} r={radius}
              stroke={disciplineColor} strokeWidth={strokeWidth} fill="none"
              strokeDasharray={`${progress} ${circumference - progress}`}
              strokeDashoffset={circumference * 0.25}
              strokeLinecap="round"
            />
          </Svg>
          <Text style={[styles.dayDisciplineScore, { color: disciplineColor }]}>{summary.disciplineScore}</Text>
        </View>
        <View style={styles.dayDisciplineStats}>
          <View style={styles.dayDisciplineStatRow}>
            <Text style={styles.dayDStatLabel}>Planned</Text>
            <Text style={[styles.dayDStatValue, { color: colors.primary }]}>{summary.plannedTrades}</Text>
          </View>
          <View style={styles.dayDisciplineStatRow}>
            <Text style={styles.dayDStatLabel}>Unplanned</Text>
            <Text style={[styles.dayDStatValue, { color: colors.verdictWait }]}>{summary.unplannedTrades}</Text>
          </View>
          <View style={styles.dayDisciplineStatRow}>
            <Text style={styles.dayDStatLabel}>W/L</Text>
            <Text style={styles.dayDStatValue}>
              <Text style={{ color: colors.marketUp }}>{summary.wins}</Text>
              <Text style={{ color: colors.textMuted }}>/</Text>
              <Text style={{ color: colors.marketDown }}>{summary.losses}</Text>
            </Text>
          </View>
          <View style={styles.dayDisciplineStatRow}>
            <Text style={styles.dayDStatLabel}>P&L</Text>
            <Text style={[styles.dayDStatValue, { color: summary.pnlR >= 0 ? colors.marketUp : colors.marketDown }]}>
              {summary.pnlR >= 0 ? '+' : ''}{summary.pnlR.toFixed(1)}R
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Hero Stat Card ─────────────────────────────────────────────

function HeroStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.heroCard}>
      <Text style={styles.heroLabel}>{label}</Text>
      <Text style={[styles.heroValue, { color }]}>{value}</Text>
    </View>
  );
}

// ─── Horizontal Bar ─────────────────────────────────────────────

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
  const barWidth = Math.max(rate, 2);

  return (
    <View style={styles.barRow}>
      <View style={styles.barLabelContainer}>
        {emoji ? <Text style={styles.barEmoji}>{emoji}</Text> : null}
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

// ─── Equity Curve Chart ─────────────────────────────────────────

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

  const areaPoints =
    data.map((val, i) => `${toX(i).toFixed(1)},${toY(val).toFixed(1)}`).join(' ') +
    ` ${toX(data.length - 1).toFixed(1)},${zeroY.toFixed(1)}` +
    ` ${toX(0).toFixed(1)},${zeroY.toFixed(1)}`;

  const yLabels: { value: number; y: number }[] = [];
  const step = range / 4;
  for (let i = 0; i <= 4; i++) {
    const val = minR + step * i;
    yLabels.push({ value: Math.round(val * 100) / 100, y: toY(val) });
  }

  return (
    <Svg width={plotWidth} height={CHART_HEIGHT}>
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

      <Polyline
        points={areaPoints}
        fill={lineColor}
        fillOpacity={0.1}
        stroke="none"
      />

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

// ─── Metric Row ─────────────────────────────────────────────────

function MetricRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, color ? { color } : undefined]}>{value}</Text>
    </View>
  );
}

// ─── Discipline Trend Bar Chart ─────────────────────────────────

function DisciplineTrendChart({
  data,
  labels,
}: {
  data: { date: string; score: number | null }[];
  labels: string[];
}) {
  const chartWidth = SCREEN_WIDTH - spacing.xl * 2 - spacing.xl * 2;
  const chartHeight = 120;
  const barGap = 2;
  const barCount = data.length;
  const barWidth = Math.max((chartWidth - barGap * (barCount - 1)) / barCount, 4);
  const maxScore = 100;

  return (
    <View style={styles.trendChartContainer}>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Horizontal guides */}
        <Line x1={0} y1={0} x2={chartWidth} y2={0} stroke={colors.border} strokeWidth={0.5} strokeDasharray="3,3" />
        <Line x1={0} y1={chartHeight * 0.5} x2={chartWidth} y2={chartHeight * 0.5} stroke={colors.border} strokeWidth={0.5} strokeDasharray="3,3" />
        <Line x1={0} y1={chartHeight - 1} x2={chartWidth} y2={chartHeight - 1} stroke={colors.border} strokeWidth={0.5} />

        {data.map((item, i) => {
          const x = i * (barWidth + barGap);
          if (item.score === null) {
            // No trades: small grey dot
            return (
              <SvgCircle
                key={i}
                cx={x + barWidth / 2}
                cy={chartHeight - 4}
                r={2.5}
                fill={colors.textMuted}
                opacity={0.4}
              />
            );
          }
          const barHeight = Math.max((item.score / maxScore) * (chartHeight - 4), 3);
          const barColor = getDisciplineColor(item.score);
          return (
            <Path
              key={i}
              d={`M${x + 2},${chartHeight} L${x + 2},${chartHeight - barHeight + 2} Q${x + 2},${chartHeight - barHeight} ${x + 4},${chartHeight - barHeight} L${x + barWidth - 4},${chartHeight - barHeight} Q${x + barWidth - 2},${chartHeight - barHeight} ${x + barWidth - 2},${chartHeight - barHeight + 2} L${x + barWidth - 2},${chartHeight} Z`}
              fill={barColor}
              opacity={0.85}
            />
          );
        })}
      </Svg>

      {/* X-axis labels */}
      <View style={styles.trendLabelsRow}>
        {labels.map((lbl, i) => (
          <Text
            key={i}
            style={[styles.trendLabel, { width: barWidth + barGap }]}
            numberOfLines={1}
          >
            {lbl}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ─── Insight Card ───────────────────────────────────────────────

function InsightCard({ emoji, text, accentColor }: { emoji: string; text: string; accentColor: string }) {
  return (
    <Card style={[styles.insightCard, { borderLeftWidth: 3, borderLeftColor: accentColor }]}>
      <Text style={styles.insightText}>
        <Text style={styles.insightEmoji}>{emoji} </Text>
        {text}
      </Text>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════
// ═══ MAIN SCREEN ══════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════

export default function AnalyticsScreen() {
  const router = useRouter();

  // ─── Store subscriptions ────────────────────────────────────
  const hidePnl = useAppStore((s) => s.hidePnl);
  const records = useTradeRecordStore((s) => s.records);
  const getCalendarSummary = useTradeRecordStore((s) => s.getCalendarSummary);
  const calculateDisciplineScore = useTradeRecordStore((s) => s.calculateDisciplineScore);
  const getPerformanceStats = useTradeRecordStore((s) => s.getPerformanceStats);

  // ─── Calendar state ────────────────────────────────────────
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // ─── Discipline Trend state ────────────────────────────────
  const [trendRange, setTrendRange] = useState<'7D' | '30D'>('7D');

  // ─── Computed data ─────────────────────────────────────────

  const disciplineScore = useMemo(() => calculateDisciplineScore(), [calculateDisciplineScore, records]);

  const stats = useMemo(() => getPerformanceStats(), [getPerformanceStats, records]);

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

  // Streak from discipline score
  const streak = useMemo(() => {
    let count = 0;
    for (const r of records) {
      if (r.status === 'cancelled') continue;
      if (r.decision === 'followed') count++;
      else break;
    }
    return count;
  }, [records]);

  // ─── Discipline Trend data ─────────────────────────────────

  const trendData = useMemo(() => {
    const days = trendRange === '7D' ? 7 : 30;
    const result: { date: string; score: number | null }[] = [];
    const labels: string[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const day = d.getDate();
      const dateStr = toDateString(y, m, day);

      const summaries = getCalendarSummary(y, m);
      const match = summaries.find((s) => s.date === dateStr);

      if (match && match.totalTrades > 0) {
        result.push({ date: dateStr, score: match.disciplineScore });
      } else {
        result.push({ date: dateStr, score: null });
      }

      if (trendRange === '7D') {
        labels.push(SHORT_DAY_NAMES[d.getDay()]);
      } else {
        labels.push(String(day));
      }
    }

    return { data: result, labels };
  }, [trendRange, records, getCalendarSummary]);

  // ─── Calendar data ─────────────────────────────────────────

  const daySummaries = useMemo(
    () => getCalendarSummary(calYear, calMonth),
    [calYear, calMonth, records, getCalendarSummary]
  );

  const summaryMap = useMemo(() => {
    const map: Record<string, CalendarDaySummary> = {};
    daySummaries.forEach((s) => { map[s.date] = s; });
    return map;
  }, [daySummaries]);

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDayOffset = getFirstDayOffset(calYear, calMonth);
  const todayStr = getTodayString();

  const calendarCells = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDayOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [daysInMonth, firstDayOffset]);

  const selectedSummary = selectedDate ? summaryMap[selectedDate] : null;

  // ─── Monthly summary ──────────────────────────────────────
  const monthlySummary = useMemo(() => {
    const totalTradesMonth = daySummaries.reduce((sum, d) => sum + d.totalTrades, 0);
    const winsMonth = daySummaries.reduce((sum, d) => sum + d.wins, 0);
    const lossesMonth = daySummaries.reduce((sum, d) => sum + d.losses, 0);
    const closedCount = winsMonth + lossesMonth;
    const winRateMonth = closedCount > 0 ? Math.round((winsMonth / closedCount) * 100) : 0;
    const netR = daySummaries.reduce((sum, d) => sum + d.pnlR, 0);
    const netPnlDollars = daySummaries.reduce((sum, d) => sum + d.pnlDollars, 0);
    const avgDiscipline = daySummaries.length > 0
      ? Math.round(daySummaries.reduce((sum, d) => sum + d.disciplineScore, 0) / daySummaries.length)
      : 0;
    return { totalTrades: totalTradesMonth, wins: winsMonth, losses: lossesMonth, winRate: winRateMonth, netR: Math.round(netR * 100) / 100, netPnlDollars, discipline: avgDiscipline };
  }, [daySummaries]);

  // ─── Export ────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    const monthName = MONTH_NAMES[calMonth - 1];
    let text = `📊 ${monthName} ${calYear} Trading Summary\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (monthlySummary.totalTrades === 0) {
      text += `No trades this month.\n`;
    } else {
      text += `Trades: ${monthlySummary.totalTrades}\n`;
      text += `Win Rate: ${monthlySummary.winRate}%\n`;
      text += `Net P&L: ${monthlySummary.netPnlDollars >= 0 ? '+' : ''}${formatCurrency(monthlySummary.netPnlDollars)}\n`;
      text += `Net R: ${monthlySummary.netR >= 0 ? '+' : ''}${monthlySummary.netR.toFixed(1)}R\n`;
      text += `Discipline: ${monthlySummary.discipline}%\n\n`;

      text += `Daily Breakdown:\n`;
      daySummaries.forEach((d) => {
        const [, , dayNum] = d.date.split('-');
        const pnlSign = d.pnlDollars >= 0 ? '+' : '';
        text += `  ${MONTH_SHORT[calMonth - 1]} ${parseInt(dayNum)}: ${d.totalTrades} trades, ${pnlSign}${formatCurrency(d.pnlDollars)}, ${d.disciplineScore}% disc\n`;
      });
    }

    text += `\n— Exported from Nudge`;

    try {
      await Share.share({ message: text, title: `${monthName} ${calYear} Trading Summary` });
    } catch {
      Alert.alert('Export Error', 'Unable to share. Try again.');
    }
  }, [calMonth, calYear, monthlySummary, daySummaries]);

  // ─── Performance derived values ────────────────────────────

  const pnlColor = totalPnlDollars >= 0 ? colors.marketUp : colors.marketDown;
  const winRateColor = winRate >= 50 ? colors.marketUp : colors.marketDown;
  const expectancyColor = expectancy >= 0 ? colors.marketUp : colors.marketDown;
  const profitFactorColor = profitFactor >= 1 ? colors.marketUp : colors.marketDown;
  const streakColor = currentStreak > 0 ? colors.marketUp : currentStreak < 0 ? colors.marketDown : colors.textSecondary;

  const emotionEntries = useMemo(
    () => Object.entries(winRateByEmotion).sort((a, b) => b[1].total - a[1].total),
    [winRateByEmotion]
  );

  const setupEntries = useMemo(
    () => Object.entries(winRateBySetup).sort((a, b) => b[1].total - a[1].total),
    [winRateBySetup]
  );

  // ─── Tips & Insights ──────────────────────────────────────

  const insights = useMemo(() => {
    const tips: { emoji: string; text: string; accentColor: string }[] = [];
    if (totalTrades < 3) return tips;

    // Best emotion by win rate
    if (emotionEntries.length > 0) {
      const bestEmotion = emotionEntries.reduce((best, curr) => {
        if (curr[1].total >= 2 && curr[1].rate > (best?.[1]?.rate ?? 0)) return curr;
        return best;
      }, null as [string, { wins: number; total: number; rate: number }] | null);

      if (bestEmotion && bestEmotion[1].rate >= 50) {
        const display = getEmotionDisplay(bestEmotion[0]);
        tips.push({
          emoji: display.emoji || '💪',
          text: `You win ${bestEmotion[1].rate}% when feeling ${display.label} — lean into it`,
          accentColor: colors.verdictProceed,
        });
      }

      // Worst emotion by win rate
      const worstEmotion = emotionEntries.reduce((worst, curr) => {
        if (curr[1].total >= 2 && (worst === null || curr[1].rate < worst[1].rate)) return curr;
        return worst;
      }, null as [string, { wins: number; total: number; rate: number }] | null);

      if (worstEmotion && worstEmotion[1].rate < 50 && worstEmotion[0] !== bestEmotion?.[0]) {
        const display = getEmotionDisplay(worstEmotion[0]);
        tips.push({
          emoji: display.emoji || '⚠️',
          text: `Watch out when feeling ${display.label} — only ${worstEmotion[1].rate}% win rate`,
          accentColor: colors.verdictWait,
        });
      }
    }

    // Best setup by win rate
    if (setupEntries.length > 0) {
      const bestSetup = setupEntries.reduce((best, curr) => {
        if (curr[1].total >= 2 && curr[1].rate > (best?.[1]?.rate ?? 0)) return curr;
        return best;
      }, null as [string, { wins: number; total: number; rate: number }] | null);

      if (bestSetup && bestSetup[1].rate >= 50) {
        const setupLabel = getSetupDisplay(bestSetup[0]);
        tips.push({
          emoji: '📈',
          text: `Your edge: ${setupLabel} setups at ${bestSetup[1].rate}% win rate`,
          accentColor: colors.primary,
        });
      }
    }

    return tips.slice(0, 3);
  }, [totalTrades, emotionEntries, setupEntries]);

  // ─── Calendar navigation ──────────────────────────────────

  const goToPrevMonth = () => {
    if (calMonth === 1) { setCalMonth(12); setCalYear(calYear - 1); }
    else { setCalMonth(calMonth - 1); }
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    if (calMonth === 12) { setCalMonth(1); setCalYear(calYear + 1); }
    else { setCalMonth(calMonth + 1); }
    setSelectedDate(null);
  };

  const handleDayPress = (day: number) => {
    const dateStr = toDateString(calYear, calMonth, day);
    setSelectedDate(dateStr === selectedDate ? null : dateStr);
  };

  // ─── Empty State ──────────────────────────────────────────

  const activeRecords = records.filter((r) => r.status !== 'cancelled');

  if (activeRecords.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Analytics</Text>
          </View>
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No data yet</Text>
              <Text style={styles.emptyDesc}>
                Start trading to see your analytics
              </Text>
            </Card>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Render Day Cell ──────────────────────────────────────

  const renderDayCell = (day: number | null, index: number) => {
    if (day === null) return <View key={`empty-${index}`} style={styles.dayCell} />;

    const dateStr = toDateString(calYear, calMonth, day);
    const summary = summaryMap[dateStr];
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === selectedDate;
    const hasTrades = summary && summary.totalTrades > 0;

    return (
      <TouchableOpacity
        key={`day-${day}`}
        activeOpacity={0.7}
        onPress={() => handleDayPress(day)}
        style={[
          styles.dayCell,
          styles.dayCellInteractive,
          isToday && styles.dayCellToday,
          isSelected && styles.dayCellSelected,
          hasTrades && !hidePnl && {
            backgroundColor: summary.pnlDollars > 0
              ? colors.marketUp + '0A'
              : summary.pnlDollars < 0
              ? colors.marketDown + '0A'
              : undefined,
          },
        ]}
      >
        {/* Day number + discipline score row */}
        <View style={styles.cellTopRow}>
          <Text style={[
            styles.dayNumber,
            isToday && !isSelected && styles.dayNumberToday,
            isSelected && styles.dayNumberSelected,
          ]}>
            {day}
          </Text>
          {hasTrades && (
            <Text style={[styles.cellDiscipline, { color: getDisciplineColor(summary.disciplineScore) }]}>
              {summary.disciplineScore}
            </Text>
          )}
        </View>

        {/* P&L or trade count */}
        {hasTrades && (
          <Text style={[
            styles.cellPnl,
            hidePnl
              ? { color: colors.textMuted }
              : { color: summary.pnlDollars > 0 ? colors.marketUp : summary.pnlDollars < 0 ? colors.marketDown : colors.textMuted },
          ]} numberOfLines={1}>
            {hidePnl
              ? `${summary.totalTrades}t`
              : summary.pnlDollars !== 0
                ? `${summary.pnlDollars > 0 ? '+' : ''}${formatCurrency(summary.pnlDollars)}`
                : `${summary.totalTrades}t`
            }
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // ═══ RENDER ═══════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Section 1: Title ──────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
        </View>

        {/* ── Section 2: Discipline Score Hero ──────────────── */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Card style={styles.disciplineCard}>
            <View style={styles.disciplineRow}>
              <DisciplineRing score={disciplineScore.overall} />
              <View style={styles.disciplineStats}>
                <View style={styles.disciplineStat}>
                  <Text style={styles.disciplineStatLabel}>Rules</Text>
                  <Text style={styles.disciplineStatValue}>{disciplineScore.ruleAdherence}%</Text>
                </View>
                <View style={styles.disciplineStat}>
                  <Text style={styles.disciplineStatLabel}>Journal</Text>
                  <Text style={styles.disciplineStatValue}>{disciplineScore.journalConsistency}%</Text>
                </View>
                <View style={styles.disciplineStat}>
                  <Text style={styles.disciplineStatLabel}>Planned</Text>
                  <Text style={styles.disciplineStatValue}>{disciplineScore.planFollowing}%</Text>
                </View>
                <View style={styles.disciplineStat}>
                  <Text style={styles.disciplineStatLabel}>Streak</Text>
                  <Text style={[styles.disciplineStatValue, streak > 0 ? { color: colors.verdictProceed } : undefined]}>
                    {streak}
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* ── Section 3: Discipline Trend ───────────────────── */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Card style={styles.sectionCard}>
            <View style={styles.trendHeader}>
              <Text style={styles.sectionTitle}>Discipline Trend</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setTrendRange('7D')}
                  style={[styles.toggleButton, trendRange === '7D' && styles.toggleButtonActive]}
                >
                  <Text style={[styles.toggleText, trendRange === '7D' && styles.toggleTextActive]}>7D</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setTrendRange('30D')}
                  style={[styles.toggleButton, trendRange === '30D' && styles.toggleButtonActive]}
                >
                  <Text style={[styles.toggleText, trendRange === '30D' && styles.toggleTextActive]}>30D</Text>
                </TouchableOpacity>
              </View>
            </View>
            <DisciplineTrendChart data={trendData.data} labels={trendData.labels} />
          </Card>
        </Animated.View>

        {/* ── Section 4: Trades Calendar ────────────────────── */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <Card style={styles.calendarCard}>
            {/* Header: Trades + Export */}
            <View style={styles.calHeaderRow}>
              <Text style={styles.sectionTitle}>Trades</Text>
              <TouchableOpacity onPress={handleExport} style={styles.exportBtn} activeOpacity={0.7}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text style={styles.exportText}>Export</Text>
              </TouchableOpacity>
            </View>

            {/* Monthly P&L Hero */}
            {monthlySummary.totalTrades > 0 && (
              <View style={styles.monthlyHero}>
                <Text style={styles.monthlyLabel}>
                  {hidePnl ? `${MONTH_NAMES[calMonth - 1]} Summary` : `${MONTH_NAMES[calMonth - 1]} P&L`}
                </Text>
                {!hidePnl && (
                  <Text style={[styles.monthlyPnl, {
                    color: monthlySummary.netPnlDollars >= 0 ? colors.marketUp : colors.marketDown,
                  }]}>
                    {monthlySummary.netPnlDollars >= 0 ? '+' : ''}{formatCurrency(monthlySummary.netPnlDollars)}
                  </Text>
                )}
                <View style={styles.monthlyStats}>
                  <View style={styles.monthlyStatItem}>
                    <Text style={styles.monthlyStatVal}>{monthlySummary.totalTrades}</Text>
                    <Text style={styles.monthlyStatLabel}>Trades</Text>
                  </View>
                  <View style={styles.monthlyStatDivider} />
                  <View style={styles.monthlyStatItem}>
                    <Text style={[styles.monthlyStatVal, {
                      color: monthlySummary.winRate >= 50 ? colors.marketUp : colors.marketDown,
                    }]}>{monthlySummary.winRate}%</Text>
                    <Text style={styles.monthlyStatLabel}>Win Rate</Text>
                  </View>
                  {!hidePnl && (
                    <>
                      <View style={styles.monthlyStatDivider} />
                      <View style={styles.monthlyStatItem}>
                        <Text style={[styles.monthlyStatVal, {
                          color: monthlySummary.netR >= 0 ? colors.marketUp : colors.marketDown,
                        }]}>{monthlySummary.netR >= 0 ? '+' : ''}{monthlySummary.netR.toFixed(1)}R</Text>
                        <Text style={styles.monthlyStatLabel}>Net R</Text>
                      </View>
                    </>
                  )}
                  <View style={styles.monthlyStatDivider} />
                  <View style={styles.monthlyStatItem}>
                    <Text style={[styles.monthlyStatVal, {
                      color: getDisciplineColor(monthlySummary.discipline),
                    }]}>{monthlySummary.discipline}%</Text>
                    <Text style={styles.monthlyStatLabel}>Discipline</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Month Navigation */}
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton} activeOpacity={0.7}>
                <ChevronLeft />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>{MONTH_NAMES[calMonth - 1]} {calYear}</Text>
              <TouchableOpacity onPress={goToNextMonth} style={styles.navButton} activeOpacity={0.7}>
                <ChevronRight />
              </TouchableOpacity>
            </View>

            {/* Day-of-week headers */}
            <View style={styles.weekHeader}>
              {DAY_LABELS.map((label, i) => (
                <View key={`label-${i}`} style={styles.weekHeaderCell}>
                  <Text style={styles.weekHeaderText}>{label}</Text>
                </View>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {calendarCells.map((day, index) => renderDayCell(day, index))}
            </View>

            {/* Day Detail */}
            {selectedDate && selectedSummary && selectedSummary.totalTrades > 0 && (
              <DayDisciplineCard summary={selectedSummary} />
            )}

            {selectedDate && (!selectedSummary || selectedSummary.totalTrades === 0) && (
              <View style={styles.noTradesContainer}>
                <Text style={styles.noTradesText}>No trades on this day</Text>
              </View>
            )}
          </Card>
        </Animated.View>

        {/* ── Section 5: Performance Stats ──────────────────── */}

        {/* Hero Stats Row */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
          <View style={styles.heroRow}>
            <HeroStat label="Win Rate" value={`${winRate}%`} color={winRateColor} />
            <HeroStat label="Expectancy" value={`${expectancy >= 0 ? '+' : ''}${expectancy.toFixed(2)}R`} color={expectancyColor} />
            <HeroStat label="Profit Factor" value={profitFactor.toFixed(2)} color={profitFactorColor} />
          </View>
        </Animated.View>

        {/* P&L Summary — hidden when hidePnl is on */}
        {!hidePnl && (
          <Animated.View entering={FadeInDown.delay(450).duration(400)}>
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
          </Animated.View>
        )}

        {/* Equity Curve — hidden when hidePnl is on */}
        {!hidePnl && (
        <Animated.View entering={FadeInDown.delay(500).duration(400)}>
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Equity Curve (R)</Text>
            <View style={styles.chartContainer}>
              <EquityCurve data={equityCurveR} />
            </View>
            {equityCurveR.length > 0 && (
              <View style={styles.chartAxisRow}>
                <Text style={styles.chartAxisLabel}>Trade #1</Text>
                <Text style={styles.chartAxisLabel}>Trade #{equityCurveR.length}</Text>
              </View>
            )}
          </Card>
        </Animated.View>
        )}

        {/* Win Rate by Emotion */}
        {emotionEntries.length > 0 && (
          <Animated.View entering={FadeInDown.delay(550).duration(400)}>
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
          </Animated.View>
        )}

        {/* Win Rate by Setup */}
        {setupEntries.length > 0 && (
          <Animated.View entering={FadeInDown.delay(600).duration(400)}>
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
          </Animated.View>
        )}

        {/* Key Metrics */}
        <Animated.View entering={FadeInDown.delay(650).duration(400)}>
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Key Metrics</Text>
            <View style={styles.metricsContainer}>
              <MetricRow label="Avg Winner" value={formatR(avgWinR)} color={colors.marketUp} />
              <MetricRow label="Avg Loser" value={formatR(avgLossR)} color={colors.marketDown} />
              <MetricRow label="Largest Win" value={formatR(largestWinR)} color={colors.marketUp} />
              <MetricRow label="Largest Loss" value={formatR(largestLossR)} color={colors.marketDown} />
              <MetricRow label="Current Streak" value={formatStreakLabel(currentStreak)} color={streakColor} />
            </View>
          </Card>
        </Animated.View>

        {/* ── Section 6: Tips & Insights ────────────────────── */}
        {insights.length > 0 && (
          <Animated.View entering={FadeInDown.delay(700).duration(400)}>
            <Text style={styles.insightsTitle}>Tips & Insights</Text>
            <View style={styles.insightsContainer}>
              {insights.map((tip, i) => (
                <InsightCard key={i} emoji={tip.emoji} text={tip.text} accentColor={tip.accentColor} />
              ))}
            </View>
          </Animated.View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════
// ═══ STYLES ═══════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════

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

  // ─── Empty State ──────────────────────────────────────────
  emptyCard: {
    marginHorizontal: spacing.xl,
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
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

  // ─── Discipline Score Hero ────────────────────────────────
  disciplineCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    paddingVertical: spacing.lg,
  },
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

  // ─── Section Card (generic) ───────────────────────────────
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

  // ─── Discipline Trend ─────────────────────────────────────
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  toggleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceHover,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: typography.xs,
    fontFamily: typography.semiBold,
    color: colors.textMuted,
  },
  toggleTextActive: {
    color: colors.white,
  },
  trendChartContainer: {
    gap: spacing.xs,
  },
  trendLabelsRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  trendLabel: {
    fontSize: 9,
    fontFamily: typography.regular,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // ─── Calendar ─────────────────────────────────────────────
  calendarCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: typography.base,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  weekHeader: {
    flexDirection: 'row',
  },
  weekHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  weekHeaderText: {
    fontSize: typography.xs,
    fontFamily: typography.semiBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%` as unknown as number,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: 2,
    minHeight: 56,
  },
  dayCellInteractive: {
    borderRadius: radii.sm,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radii.sm,
  },
  dayCellSelected: {
    backgroundColor: colors.primary + '22',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radii.sm,
  },
  dayNumber: {
    fontSize: typography.xs,
    fontFamily: typography.semiBold,
    color: colors.textSecondary,
  },
  dayNumberToday: {
    color: colors.primary,
  },
  dayNumberSelected: {
    color: colors.textPrimary,
  },
  cellTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 3,
  },
  cellDiscipline: {
    fontSize: 8,
    fontFamily: typography.bold,
  },
  cellPnl: {
    fontSize: 9,
    fontFamily: typography.bold,
    marginTop: 2,
  },

  // ─── Calendar Header + Export ──────────────────────────────
  calHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  exportText: {
    fontSize: typography.xs,
    fontFamily: typography.semiBold,
    color: colors.primary,
  },

  // ─── Monthly P&L Hero ─────────────────────────────────────
  monthlyHero: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  monthlyLabel: {
    fontSize: typography.xs,
    fontFamily: typography.semiBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  monthlyPnl: {
    fontSize: typography.display,
    fontFamily: typography.bold,
  },
  monthlyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  monthlyStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  monthlyStatVal: {
    fontSize: typography.sm,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  monthlyStatLabel: {
    fontSize: 9,
    fontFamily: typography.semiBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  monthlyStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },

  // ─── Day Discipline Card ──────────────────────────────────
  dayDisciplineCard: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  dayDisciplineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  dayDisciplineRingWrap: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayDisciplineScore: {
    position: 'absolute',
    fontSize: typography.sm,
    fontFamily: typography.bold,
  },
  dayDisciplineStats: {
    flex: 1,
    gap: spacing.xs,
  },
  dayDisciplineStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayDStatLabel: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },
  dayDStatValue: {
    fontSize: typography.xs,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },

  noTradesContainer: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  noTradesText: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },

  // ─── Performance Hero Stats ───────────────────────────────
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

  // ─── P&L Summary ─────────────────────────────────────────
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

  // ─── Equity Curve ────────────────────────────────────────
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

  // ─── Win Rate Bars ───────────────────────────────────────
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

  // ─── Key Metrics ─────────────────────────────────────────
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

  // ─── Tips & Insights ─────────────────────────────────────
  insightsTitle: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  insightsContainer: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  insightCard: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  insightText: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  insightEmoji: {
    fontSize: typography.base,
  },
});
