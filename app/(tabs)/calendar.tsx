import { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, radii } from '../../src/theme';
import { Card } from '../../src/components/ui';
import { useTradeRecordStore } from '../../src/stores/useTradeRecordStore';
import { CalendarDaySummary, TradeRecord, EMOTION_OPTIONS, SETUP_OPTIONS } from '../../src/types/models';
import { formatCurrency } from '../../src/utils/formatting';
import { Svg, Path, Circle as SvgCircle } from 'react-native-svg';

// ─── Constants ──────────────────────────────────────────────────
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── Helpers ────────────────────────────────────────────────────
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

function getDisciplineColor(score: number): string {
  if (score >= 80) return colors.verdictProceed;
  if (score >= 60) return colors.verdictAdjust;
  if (score >= 40) return colors.verdictWait;
  return colors.verdictStop;
}

function getEmotionEmoji(tag?: string): string {
  if (!tag) return '';
  return EMOTION_OPTIONS.find((e) => e.value === tag)?.emoji ?? '';
}

function getEmotionLabel(tag?: string): string {
  if (!tag) return '';
  return EMOTION_OPTIONS.find((e) => e.value === tag)?.label ?? tag;
}

function getSetupLabel(tag?: string): string {
  if (!tag) return '';
  return SETUP_OPTIONS.find((s) => s.value === tag)?.label ?? tag;
}

// ─── Arrow Icons ────────────────────────────────────────────────
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

// ─── Day Detail Discipline Card ─────────────────────────────────
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

// ─── Trade Card (Day Detail) ────────────────────────────────────
function TradeCard({ trade, onPress }: { trade: TradeRecord; onPress?: () => void }) {
  const isBuy = trade.trade.direction === 'buy';
  const isClosed = trade.status === 'closed';
  const pnl = trade.pnlDollars ?? 0;
  const pnlPositive = pnl >= 0;

  const verdictColorMap: Record<string, string> = {
    proceed: colors.verdictProceed,
    adjust: colors.verdictAdjust,
    wait: colors.verdictWait,
    stop: colors.verdictStop,
  };
  const verdictBgMap: Record<string, string> = {
    proceed: colors.verdictProceedBg,
    adjust: colors.verdictAdjustBg,
    wait: colors.verdictWaitBg,
    stop: colors.verdictStopBg,
  };

  const emotionEmoji = getEmotionEmoji(trade.entryEmotion);
  const emotionLabel = getEmotionLabel(trade.entryEmotion);
  const setupLabel = getSetupLabel(trade.setupTag);
  const hasJournal = trade.entryEmotion || trade.setupTag || trade.entryNote;

  return (
    <TouchableOpacity
      activeOpacity={trade.status === 'active' ? 0.7 : 1}
      onPress={trade.status === 'active' ? onPress : undefined}
    >
      <View style={styles.tradeCard}>
        <View style={styles.tradeCardTop}>
          <View style={styles.tradeCardLeft}>
            <Text style={styles.tradeTicker}>{trade.trade.ticker}</Text>
            <View style={[styles.directionBadge, { backgroundColor: isBuy ? colors.marketUp + '18' : colors.marketDown + '18' }]}>
              <Text style={[styles.directionText, { color: isBuy ? colors.marketUp : colors.marketDown }]}>
                {isBuy ? 'BUY' : 'SELL'}
              </Text>
            </View>
            <View style={[styles.verdictChip, { backgroundColor: verdictBgMap[trade.verdict.level] }]}>
              <Text style={[styles.verdictChipText, { color: verdictColorMap[trade.verdict.level] }]}>
                {trade.verdict.level.charAt(0).toUpperCase() + trade.verdict.level.slice(1)}
              </Text>
            </View>
          </View>
          {isClosed && (
            <Text style={[styles.tradePnl, { color: pnlPositive ? colors.marketUp : colors.marketDown }]}>
              {pnlPositive ? '+' : ''}{formatCurrency(pnl)}
            </Text>
          )}
          {trade.status === 'active' && (
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>Active</Text>
            </View>
          )}
        </View>

        <View style={styles.tradeCardBottom}>
          <View style={[
            styles.plannedChip,
            { backgroundColor: trade.isPlanned ? colors.primary + '18' : colors.verdictWait + '18' },
          ]}>
            <Text style={[
              styles.plannedChipText,
              { color: trade.isPlanned ? colors.primary : colors.verdictWait },
            ]}>
              {trade.isPlanned ? 'Planned' : 'Unplanned'}
            </Text>
          </View>
          {isClosed && trade.pnlR !== undefined && (
            <Text style={styles.tradeR}>
              {trade.pnlR >= 0 ? '+' : ''}{trade.pnlR.toFixed(2)}R
            </Text>
          )}
        </View>

        {hasJournal && (
          <View style={styles.journalSection}>
            <View style={styles.journalRow}>
              {trade.entryEmotion && (
                <View style={styles.journalTag}>
                  <Text style={styles.journalTagEmoji}>{emotionEmoji}</Text>
                  <Text style={styles.journalTagText}>{emotionLabel}</Text>
                </View>
              )}
              {trade.setupTag && (
                <View style={styles.journalTag}>
                  <Text style={styles.journalTagText}>{setupLabel}</Text>
                </View>
              )}
            </View>
            {trade.entryNote ? (
              <Text style={styles.journalNote} numberOfLines={2}>{trade.entryNote}</Text>
            ) : null}
          </View>
        )}

        {isClosed && (trade.exitEmotion || trade.exitNote) && (
          <View style={styles.exitJournalSection}>
            <Text style={styles.exitJournalLabel}>Exit</Text>
            <View style={styles.journalRow}>
              {trade.exitEmotion && (
                <View style={styles.journalTag}>
                  <Text style={styles.journalTagEmoji}>{getEmotionEmoji(trade.exitEmotion)}</Text>
                  <Text style={styles.journalTagText}>{getEmotionLabel(trade.exitEmotion)}</Text>
                </View>
              )}
            </View>
            {trade.exitNote ? (
              <Text style={styles.journalNote} numberOfLines={2}>{trade.exitNote}</Text>
            ) : null}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Component ─────────────────────────────────────────────
export default function CalendarScreen() {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(getTodayString());

  const records = useTradeRecordStore((s) => s.records);
  const getCalendarSummary = useTradeRecordStore((s) => s.getCalendarSummary);

  const daySummaries = useMemo(() => getCalendarSummary(year, month), [year, month, records, getCalendarSummary]);
  const summaryMap = useMemo(() => {
    const map: Record<string, CalendarDaySummary> = {};
    daySummaries.forEach((s) => { map[s.date] = s; });
    return map;
  }, [daySummaries]);

  const toLocalDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const selectedTrades = useMemo(() => {
    if (!selectedDate) return [];
    return records
      .filter((r) => toLocalDate(r.createdAt) === selectedDate)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [selectedDate, records]);

  const selectedSummary = selectedDate ? summaryMap[selectedDate] : null;

  // Monthly summary
  const monthlySummary = useMemo(() => {
    const totalTrades = daySummaries.reduce((sum, d) => sum + d.totalTrades, 0);
    const wins = daySummaries.reduce((sum, d) => sum + d.wins, 0);
    const losses = daySummaries.reduce((sum, d) => sum + d.losses, 0);
    const closedCount = wins + losses;
    const winRate = closedCount > 0 ? Math.round((wins / closedCount) * 100) : 0;
    const netR = daySummaries.reduce((sum, d) => sum + d.pnlR, 0);
    const netPnlDollars = daySummaries.reduce((sum, d) => sum + d.pnlDollars, 0);
    const avgDiscipline = daySummaries.length > 0
      ? Math.round(daySummaries.reduce((sum, d) => sum + d.disciplineScore, 0) / daySummaries.length)
      : 0;
    return { totalTrades, wins, losses, winRate, netR: Math.round(netR * 100) / 100, netPnlDollars, discipline: avgDiscipline };
  }, [daySummaries]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOffset = getFirstDayOffset(year, month);
  const todayStr = getTodayString();

  const calendarCells = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDayOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [daysInMonth, firstDayOffset]);

  const goToPrevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else { setMonth(month - 1); }
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else { setMonth(month + 1); }
    setSelectedDate(null);
  };

  const handleDayPress = (day: number) => {
    const dateStr = toDateString(year, month, day);
    setSelectedDate(dateStr === selectedDate ? null : dateStr);
  };

  const handleTradePress = (trade: TradeRecord) => {
    if (trade.status === 'active') {
      router.push({ pathname: '/checkpoint/close-trade', params: { id: trade.id } });
    }
  };

  // ─── Export ───────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    const monthName = MONTH_NAMES[month - 1];
    let text = `📊 ${monthName} ${year} Trading Summary\n`;
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
        text += `  ${MONTH_SHORT[month - 1]} ${parseInt(dayNum)}: ${d.totalTrades} trades, ${pnlSign}${formatCurrency(d.pnlDollars)}, ${d.disciplineScore}% disc\n`;
      });
    }

    text += `\n— Exported from Nudge`;

    try {
      await Share.share({ message: text, title: `${monthName} ${year} Trading Summary` });
    } catch {
      Alert.alert('Export Error', 'Unable to share. Try again.');
    }
  }, [month, year, monthlySummary, daySummaries]);

  // Render a single calendar day cell
  const renderDayCell = (day: number | null, index: number) => {
    if (day === null) return <View key={`empty-${index}`} style={styles.dayCell} />;

    const dateStr = toDateString(year, month, day);
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
          hasTrades && {
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
            { color: summary.pnlDollars > 0 ? colors.marketUp : summary.pnlDollars < 0 ? colors.marketDown : colors.textMuted },
          ]} numberOfLines={1}>
            {summary.pnlDollars !== 0
              ? `${summary.pnlDollars > 0 ? '+' : ''}${formatCurrency(summary.pnlDollars)}`
              : `${summary.totalTrades}t`
            }
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Header: Title + Export ─── */}
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>Trades</Text>
          <TouchableOpacity onPress={handleExport} style={styles.exportBtn} activeOpacity={0.7}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={styles.exportText}>Export</Text>
          </TouchableOpacity>
        </View>

        {/* ── Monthly P&L Hero ─── */}
        {monthlySummary.totalTrades > 0 && (
          <View style={styles.monthlyHero}>
            <Text style={styles.monthlyLabel}>
              {MONTH_NAMES[month - 1]} P&L
            </Text>
            <Text style={[styles.monthlyPnl, {
              color: monthlySummary.netPnlDollars >= 0 ? colors.marketUp : colors.marketDown,
            }]}>
              {monthlySummary.netPnlDollars >= 0 ? '+' : ''}{formatCurrency(monthlySummary.netPnlDollars)}
            </Text>
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
              <View style={styles.monthlyStatDivider} />
              <View style={styles.monthlyStatItem}>
                <Text style={[styles.monthlyStatVal, {
                  color: monthlySummary.netR >= 0 ? colors.marketUp : colors.marketDown,
                }]}>{monthlySummary.netR >= 0 ? '+' : ''}{monthlySummary.netR.toFixed(1)}R</Text>
                <Text style={styles.monthlyStatLabel}>Net R</Text>
              </View>
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

        {/* ── Month Navigation ─── */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton} activeOpacity={0.7}>
            <ChevronLeft />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{MONTH_NAMES[month - 1]} {year}</Text>
          <TouchableOpacity onPress={goToNextMonth} style={styles.navButton} activeOpacity={0.7}>
            <ChevronRight />
          </TouchableOpacity>
        </View>

        {/* ── Day-of-week headers ─── */}
        <View style={styles.weekHeader}>
          {DAY_LABELS.map((label, i) => (
            <View key={`label-${i}`} style={styles.weekHeaderCell}>
              <Text style={styles.weekHeaderText}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ── Calendar Grid ─── */}
        <View style={styles.calendarGrid}>
          {calendarCells.map((day, index) => renderDayCell(day, index))}
        </View>

        {/* ── Day Detail Section ─── */}
        {selectedDate && (
          <View style={styles.dayDetailSection}>
            <View style={styles.dayDetailHeader}>
              <Text style={styles.dayDetailTitle}>
                {formatDisplayDate(selectedDate)}
              </Text>
              {selectedTrades.length > 0 && (
                <Text style={styles.dayDetailCount}>
                  {selectedTrades.length} trade{selectedTrades.length !== 1 ? 's' : ''}
                </Text>
              )}
            </View>

            {selectedSummary && selectedSummary.totalTrades > 0 && (
              <DayDisciplineCard summary={selectedSummary} />
            )}

            {selectedTrades.length > 0 ? (
              <View style={styles.tradeList}>
                {selectedTrades.map((trade) => (
                  <TradeCard key={trade.id} trade={trade} onPress={() => handleTradePress(trade)} />
                ))}
              </View>
            ) : (
              <View style={styles.noTradesContainer}>
                <Text style={styles.noTradesText}>No trades on this day</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Empty State ─── */}
        {monthlySummary.totalTrades === 0 && (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No trades this month</Text>
            <Text style={styles.emptyDesc}>
              Trades will appear here as you log them. Each day shows your P&L and discipline score.
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Date Formatting Helper ─────────────────────────────────────
function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${d}`;
}

// ─── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 120,
    gap: spacing.md,
  },

  // ── Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: typography.xl,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  exportText: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.primary,
  },

  // ── Monthly P&L Hero
  monthlyHero: {
    alignItems: 'center',
    backgroundColor: colors.surface,
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

  // ── Month Navigation
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: typography.md,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },

  // ── Week Header
  weekHeader: { flexDirection: 'row' },
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

  // ── Calendar Grid
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
  dayCellInteractive: { borderRadius: radii.sm },
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

  // ── Cell contents
  cellTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 3,
  },
  dayNumber: {
    fontSize: typography.xs,
    fontFamily: typography.semiBold,
    color: colors.textSecondary,
  },
  dayNumberToday: { color: colors.primary },
  dayNumberSelected: { color: colors.textPrimary },
  cellDiscipline: {
    fontSize: 8,
    fontFamily: typography.bold,
  },
  cellPnl: {
    fontSize: 9,
    fontFamily: typography.bold,
    marginTop: 2,
  },

  // ── Day Detail Section
  dayDetailSection: { gap: spacing.md, marginTop: spacing.sm },
  dayDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  dayDetailTitle: {
    fontSize: typography.md,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  dayDetailCount: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textMuted,
  },

  // ── Day Discipline Card
  dayDisciplineCard: {
    backgroundColor: colors.surface,
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

  // ── Trade List
  tradeList: { gap: spacing.sm },
  tradeCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  tradeCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tradeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  tradeTicker: {
    fontSize: typography.base,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  directionBadge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
  },
  directionText: {
    fontSize: 10,
    fontFamily: typography.bold,
    letterSpacing: 0.5,
  },
  verdictChip: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
  },
  verdictChipText: {
    fontSize: 10,
    fontFamily: typography.semiBold,
    letterSpacing: 0.3,
  },
  tradePnl: {
    fontSize: typography.base,
    fontFamily: typography.bold,
  },
  tradeCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  plannedChip: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
  },
  plannedChipText: {
    fontSize: typography.xs,
    fontFamily: typography.semiBold,
  },
  tradeR: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textSecondary,
  },

  // ── Journal Section in Trade Card
  journalSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  journalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  journalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHover,
  },
  journalTagEmoji: { fontSize: 12 },
  journalTagText: {
    fontSize: typography.xs,
    fontFamily: typography.semiBold,
    color: colors.textSecondary,
  },
  journalNote: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 18,
  },

  // ── Exit Journal
  exitJournalSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  exitJournalLabel: {
    fontSize: 9,
    fontFamily: typography.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Active Badge
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.primary + '18',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  activeText: {
    fontSize: 10,
    fontFamily: typography.semiBold,
    color: colors.primary,
  },

  // ── No Trades
  noTradesContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  noTradesText: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },

  // ── Empty State
  emptyCard: {
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
  },
});
