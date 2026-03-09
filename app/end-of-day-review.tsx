import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Svg, Path } from 'react-native-svg';
import { colors, typography, spacing, radii } from '../src/theme';
import { Card } from '../src/components/ui';
import { useTradeRecordStore } from '../src/stores/useTradeRecordStore';
import { useJournalStore } from '../src/stores/useJournalStore';
import { useDailyPlanStore } from '../src/stores/useDailyPlanStore';
import { useEndOfDayReviewStore } from '../src/stores/useEndOfDayReviewStore';
import { useStreakStore } from '../src/stores/useStreakStore';
import { EMOTION_OPTIONS, OVERRIDE_REASON_OPTIONS } from '../src/types/models';
import { generateId } from '../src/utils/uuid';
import { formatCurrency } from '../src/utils/formatting';
import { format } from 'date-fns';

export default function EndOfDayReviewScreen() {
  const router = useRouter();
  const { records } = useTradeRecordStore();
  const journalEntries = useJournalStore((s) => s.entries);
  const todayPlan = useDailyPlanStore((s) => s.getTodayPlan)();
  const { getTodayReview, addReview, updateReview } = useEndOfDayReviewStore();
  const { recordCompletion } = useStreakStore();

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Get today's trades
  const todayRecords = useMemo(() => {
    return records.filter((r) => {
      const d = new Date(r.createdAt);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return dateStr === todayStr && r.status !== 'cancelled';
    });
  }, [records, todayStr]);

  // Get today's journal entries count
  const todayJournalCount = useMemo(() => {
    return journalEntries.filter((e) => {
      const d = new Date(e.createdAt);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return dateStr === todayStr;
    }).length;
  }, [journalEntries, todayStr]);

  // Auto-calculate today's stats
  const todayStats = useMemo(() => {
    const followed = todayRecords.filter((r) => r.decision === 'followed').length;
    const overridden = todayRecords.filter((r) => r.decision === 'overrode').length;
    const planned = todayRecords.filter((r) => r.isPlanned).length;
    const unplanned = todayRecords.filter((r) => !r.isPlanned).length;
    const closed = todayRecords.filter((r) => r.status === 'closed');
    const pnl = closed.reduce((sum, r) => sum + (r.pnlDollars ?? 0), 0);
    const wins = closed.filter((r) => (r.pnlDollars ?? 0) > 0).length;
    const losses = closed.filter((r) => (r.pnlDollars ?? 0) < 0).length;

    return {
      totalTrades: todayRecords.length,
      followed,
      overridden,
      planned,
      unplanned,
      pnl,
      wins,
      losses,
    };
  }, [todayRecords]);

  // Check for existing review
  const existingReview = getTodayReview();

  // Form state
  const [disciplineRating, setDisciplineRating] = useState(existingReview?.disciplineRating ?? 0);
  const [bestDecision, setBestDecision] = useState(existingReview?.bestDecision ?? '');
  const [worstDecision, setWorstDecision] = useState(existingReview?.worstDecision ?? '');
  const [lessonLearned, setLessonLearned] = useState(existingReview?.lessonLearned ?? '');
  const [tomorrowFocus, setTomorrowFocus] = useState(existingReview?.tomorrowFocus ?? '');

  const canSave = disciplineRating > 0;

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (existingReview) {
      updateReview(existingReview.id, {
        disciplineRating,
        bestDecision,
        worstDecision,
        lessonLearned,
        tomorrowFocus,
        plannedTrades: todayStats.planned,
        actualTrades: todayStats.totalTrades,
        followedVerdicts: todayStats.followed,
        overroddenVerdicts: todayStats.overridden,
      });
    } else {
      addReview({
        id: generateId(),
        date: todayStr,
        plannedTrades: todayStats.planned,
        actualTrades: todayStats.totalTrades,
        followedVerdicts: todayStats.followed,
        overroddenVerdicts: todayStats.overridden,
        disciplineRating,
        bestDecision,
        worstDecision,
        lessonLearned,
        tomorrowFocus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Record streak completion
    recordCompletion('review');

    router.back();
  };

  const planWatchlistCount = todayPlan?.watchlist.filter(Boolean).length ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50).duration(300)} style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>End-of-Day Review</Text>
            <Text style={styles.headerDate}>{format(now, 'EEEE, MMMM d')}</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.closeBtn}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path d="M18 6L6 18M6 6l12 12" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" />
            </Svg>
          </TouchableOpacity>
        </Animated.View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Auto-Calculated Scorecard */}
          <Animated.View entering={FadeInDown.delay(100).duration(300)}>
            <Card style={styles.scorecardCard}>
              <Text style={styles.sectionLabel}>TODAY'S SCORECARD</Text>
              <View style={styles.scorecardGrid}>
                <View style={styles.scorecardItem}>
                  <Text style={styles.scorecardValue}>{todayStats.totalTrades}</Text>
                  <Text style={styles.scorecardLabel}>Trades</Text>
                </View>
                <View style={styles.scorecardItem}>
                  <Text style={[styles.scorecardValue, { color: colors.verdictProceed }]}>{todayStats.followed}</Text>
                  <Text style={styles.scorecardLabel}>Followed</Text>
                </View>
                <View style={styles.scorecardItem}>
                  <Text style={[styles.scorecardValue, { color: todayStats.overridden > 0 ? colors.verdictStop : colors.textMuted }]}>{todayStats.overridden}</Text>
                  <Text style={styles.scorecardLabel}>Overrode</Text>
                </View>
                <View style={styles.scorecardItem}>
                  <Text style={[styles.scorecardValue, { color: todayStats.pnl >= 0 ? colors.marketUp : colors.marketDown }]}>
                    {todayStats.pnl >= 0 ? '+' : ''}{todayStats.pnl.toFixed(0)}
                  </Text>
                  <Text style={styles.scorecardLabel}>P&L</Text>
                </View>
              </View>

              {/* Plan vs Reality */}
              {todayPlan && (
                <View style={styles.planVsReality}>
                  <View style={styles.planVsRow}>
                    <Text style={styles.planVsLabel}>Plan said</Text>
                    <Text style={styles.planVsValue}>
                      {planWatchlistCount} ticker{planWatchlistCount !== 1 ? 's' : ''} watchlisted
                    </Text>
                  </View>
                  <View style={styles.planVsRow}>
                    <Text style={styles.planVsLabel}>You did</Text>
                    <Text style={[styles.planVsValue, {
                      color: todayStats.unplanned > 0 ? colors.verdictWait : colors.verdictProceed,
                    }]}>
                      {todayStats.planned} planned, {todayStats.unplanned} unplanned
                    </Text>
                  </View>
                  {todayPlan.intention ? (
                    <View style={styles.planVsRow}>
                      <Text style={styles.planVsLabel}>Intention</Text>
                      <Text style={styles.planVsIntention}>"{todayPlan.intention}"</Text>
                    </View>
                  ) : null}
                </View>
              )}
            </Card>
          </Animated.View>

          {/* Discipline Self-Rating */}
          <Animated.View entering={FadeInDown.delay(200).duration(300)}>
            <Text style={styles.sectionLabel}>HOW DISCIPLINED WERE YOU?</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((n) => {
                const isSelected = disciplineRating === n;
                const ratingColors = [
                  colors.verdictStop,
                  colors.verdictWait,
                  colors.verdictAdjust,
                  colors.verdictProceed,
                  colors.primary,
                ];
                const ratingLabels = ['Poor', 'Weak', 'Okay', 'Good', 'Excellent'];
                return (
                  <TouchableOpacity
                    key={n}
                    style={[
                      styles.ratingBtn,
                      isSelected && { backgroundColor: ratingColors[n - 1] + '25', borderColor: ratingColors[n - 1] },
                    ]}
                    onPress={() => {
                      setDisciplineRating(n);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.ratingNumber,
                      isSelected && { color: ratingColors[n - 1] },
                    ]}>{n}</Text>
                    <Text style={[
                      styles.ratingLabel,
                      isSelected && { color: ratingColors[n - 1] },
                    ]}>{ratingLabels[n - 1]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>

          {/* Reflection Questions */}
          <Animated.View entering={FadeInDown.delay(300).duration(300)}>
            <Text style={styles.sectionLabel}>BEST DECISION TODAY</Text>
            <TextInput
              style={styles.textInput}
              placeholder="What went well? What should you repeat?"
              placeholderTextColor={colors.textMuted}
              value={bestDecision}
              onChangeText={setBestDecision}
              multiline
              numberOfLines={2}
              maxLength={200}
              textAlignVertical="top"
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(350).duration(300)}>
            <Text style={styles.sectionLabel}>WHAT WOULD YOU DO DIFFERENTLY?</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Any mistakes, impulse trades, or rule breaks?"
              placeholderTextColor={colors.textMuted}
              value={worstDecision}
              onChangeText={setWorstDecision}
              multiline
              numberOfLines={2}
              maxLength={200}
              textAlignVertical="top"
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(300)}>
            <Text style={styles.sectionLabel}>KEY LESSON</Text>
            <TextInput
              style={styles.textInput}
              placeholder="One thing you learned today..."
              placeholderTextColor={colors.textMuted}
              value={lessonLearned}
              onChangeText={setLessonLearned}
              multiline
              numberOfLines={2}
              maxLength={200}
              textAlignVertical="top"
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(450).duration(300)}>
            <Text style={styles.sectionLabel}>FOCUS FOR TOMORROW</Text>
            <TextInput
              style={styles.textInput}
              placeholder="What will you prioritize next session?"
              placeholderTextColor={colors.textMuted}
              value={tomorrowFocus}
              onChangeText={setTomorrowFocus}
              multiline
              numberOfLines={2}
              maxLength={200}
              textAlignVertical="top"
            />
          </Animated.View>

          {/* Today's Trades Summary */}
          {todayRecords.length > 0 && (
            <Animated.View entering={FadeInDown.delay(500).duration(300)}>
              <Text style={styles.sectionLabel}>
                TODAY'S TRADES ({todayRecords.length})
                {todayJournalCount > 0 ? ` \u00B7 ${todayJournalCount} journal note${todayJournalCount !== 1 ? 's' : ''}` : ''}
              </Text>
              <View style={styles.tradesList}>
                {todayRecords.map((trade) => {
                  const isBuy = trade.trade.direction === 'buy';
                  const isClosed = trade.status === 'closed';
                  const pnl = trade.pnlDollars ?? 0;
                  const emotionInfo = trade.entryEmotion
                    ? EMOTION_OPTIONS.find((e) => e.value === trade.entryEmotion)
                    : null;
                  const overrideInfo = trade.overrideReason
                    ? OVERRIDE_REASON_OPTIONS.find((o) => o.value === trade.overrideReason)
                    : null;

                  return (
                    <View key={trade.id} style={styles.tradeRow}>
                      <View style={styles.tradeRowLeft}>
                        <Text style={styles.tradeRowTicker}>{trade.trade.ticker}</Text>
                        <View style={[styles.tradeRowDir, { backgroundColor: isBuy ? colors.marketUp + '18' : colors.marketDown + '18' }]}>
                          <Text style={[styles.tradeRowDirText, { color: isBuy ? colors.marketUp : colors.marketDown }]}>
                            {isBuy ? 'B' : 'S'}
                          </Text>
                        </View>
                        {emotionInfo && (
                          <Text style={styles.tradeRowEmoji}>{emotionInfo.emoji}</Text>
                        )}
                        {trade.decision === 'overrode' && (
                          <View style={styles.tradeRowOverride}>
                            <Text style={styles.tradeRowOverrideText}>
                              {overrideInfo ? overrideInfo.emoji : '!'} Override
                            </Text>
                          </View>
                        )}
                      </View>
                      {isClosed ? (
                        <Text style={[styles.tradeRowPnl, { color: pnl >= 0 ? colors.marketUp : colors.marketDown }]}>
                          {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                        </Text>
                      ) : (
                        <Text style={styles.tradeRowOpen}>Open</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* Save Button */}
          <Animated.View entering={FadeInDown.delay(todayRecords.length > 0 ? 600 : 500).duration(300)}>
            <TouchableOpacity
              style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!canSave}
              activeOpacity={0.8}
            >
              <Text style={styles.saveBtnText}>
                {existingReview ? 'Update Review' : 'Complete Review'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: typography.lg,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  headerDate: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceHover,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: spacing.xl,
    gap: spacing.lg,
    paddingBottom: 100,
  },
  sectionLabel: {
    fontSize: typography.xs,
    fontFamily: typography.semiBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },

  // Scorecard
  scorecardCard: {
    gap: spacing.md,
  },
  scorecardGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scorecardItem: {
    alignItems: 'center',
    gap: 2,
  },
  scorecardValue: {
    fontSize: typography.xl,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  scorecardLabel: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },
  planVsReality: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: spacing.sm,
  },
  planVsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planVsLabel: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },
  planVsValue: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },
  planVsIntention: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
    fontStyle: 'italic',
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },

  // Discipline Rating
  ratingRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ratingBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 2,
  },
  ratingNumber: {
    fontSize: typography.lg,
    fontFamily: typography.bold,
    color: colors.textSecondary,
  },
  ratingLabel: {
    fontSize: 9,
    fontFamily: typography.semiBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Text Inputs
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textPrimary,
    minHeight: 64,
    maxHeight: 100,
  },

  // Today's Trades List
  tradesList: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tradeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tradeRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  tradeRowTicker: {
    fontSize: typography.sm,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  tradeRowDir: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  tradeRowDirText: {
    fontSize: 9,
    fontFamily: typography.bold,
  },
  tradeRowEmoji: {
    fontSize: 12,
  },
  tradeRowOverride: {
    backgroundColor: colors.verdictStop + '18',
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: 3,
  },
  tradeRowOverrideText: {
    fontSize: 9,
    fontFamily: typography.semiBold,
    color: colors.verdictStop,
  },
  tradeRowPnl: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
  },
  tradeRowOpen: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },

  // Save Button
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    fontSize: typography.base,
    fontFamily: typography.bold,
    color: colors.white,
  },
});
