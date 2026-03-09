import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { generateId } from '../../src/utils/uuid';
import { colors, typography, spacing, radii } from '../../src/theme';
import { getVerdictColors } from '../../src/theme/colors';
import { Button, Card } from '../../src/components/ui';
import { useTradeStore } from '../../src/stores/useTradeStore';
import { useTradeRecordStore } from '../../src/stores/useTradeRecordStore';
import {
  TradeRecord,
  EmotionTag,
  SetupTag,
  OverrideReason,
  EMOTION_OPTIONS,
  SETUP_OPTIONS,
  OVERRIDE_REASON_OPTIONS,
  ProposedTrade,
} from '../../src/types/models';
import { formatCurrency, formatPercent } from '../../src/utils/formatting';
import { Svg, Path, Circle } from 'react-native-svg';

// ─── Verdict Icon ──────────────────────────────────────────
function VerdictIcon({ level }: { level: string }) {
  const size = 36;
  if (level === 'proceed') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M9 12l2 2 4-4" stroke={colors.white} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  if (level === 'adjust') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 8v4M12 16h.01" stroke={colors.white} strokeWidth={3} strokeLinecap="round" />
      </Svg>
    );
  }
  if (level === 'wait') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={1.5} fill={colors.white} />
        <Circle cx={8} cy={12} r={1.5} fill={colors.white} />
        <Circle cx={16} cy={12} r={1.5} fill={colors.white} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={colors.white} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Rule Check Item (enhanced with value bar) ─────────────
function RuleCheckItem({ name, passed, severity, message, currentValue, limitValue }: {
  name: string;
  passed: boolean;
  severity: string;
  message: string;
  currentValue: number;
  limitValue: number;
}) {
  const iconColor = severity === 'ok' ? colors.verdictProceed
    : severity === 'warning' ? colors.verdictAdjust : colors.verdictStop;

  // Progress as ratio (capped at 1 for display)
  const ratio = limitValue > 0 ? Math.min(currentValue / limitValue, 1.5) : 0;
  const displayRatio = Math.min(ratio, 1);

  return (
    <View style={styles.ruleItem} accessibilityRole="text" accessibilityLabel={`${name}: ${message}`}>
      <View style={[styles.ruleIcon, { backgroundColor: iconColor + '20' }]}>
        {severity === 'ok' ? (
          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
            <Path d="M9 12l2 2 4-4" stroke={iconColor} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        ) : severity === 'warning' ? (
          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
            <Path d="M12 9v3M12 16h.01" stroke={iconColor} strokeWidth={3} strokeLinecap="round" />
          </Svg>
        ) : (
          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
            <Path d="M18 6L6 18M6 6l12 12" stroke={iconColor} strokeWidth={3} strokeLinecap="round" />
          </Svg>
        )}
      </View>
      <View style={styles.ruleContent}>
        <View style={styles.ruleHeader}>
          <Text style={styles.ruleName}>{name}</Text>
          {limitValue > 0 && (
            <Text style={[styles.ruleValues, { color: iconColor }]}>
              {typeof currentValue === 'number' && currentValue % 1 !== 0
                ? currentValue.toFixed(1) : currentValue}
              {' / '}
              {typeof limitValue === 'number' && limitValue % 1 !== 0
                ? limitValue.toFixed(1) : limitValue}
            </Text>
          )}
        </View>
        {/* Progress bar */}
        {limitValue > 0 && (
          <View style={styles.ruleBar}>
            <View style={[styles.ruleBarFill, {
              width: `${displayRatio * 100}%`,
              backgroundColor: iconColor,
            }]} />
          </View>
        )}
        <Text style={[styles.ruleMessage, { color: iconColor }]}>{message}</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────
export default function VerdictScreen() {
  const router = useRouter();
  const currentTrade = useTradeStore((s) => s.currentTrade);
  const currentVerdict = useTradeStore((s) => s.currentVerdict);
  const clearCurrent = useTradeStore((s) => s.clearCurrent);
  const addCheckedTrade = useTradeStore((s) => s.addCheckedTrade);
  const addRecord = useTradeRecordStore((s) => s.addRecord);

  // Journal state
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionTag | null>(null);
  const [selectedSetup, setSelectedSetup] = useState<SetupTag | null>(null);
  const [isPlanned, setIsPlanned] = useState(true);
  const [note, setNote] = useState('');
  const [showJournal, setShowJournal] = useState(false);
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);
  const [overrideReason, setOverrideReason] = useState<OverrideReason | null>(null);

  useEffect(() => {
    if (!currentVerdict) return;
    const level = currentVerdict.level;
    if (level === 'proceed') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (level === 'adjust') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else if (level === 'wait') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [currentVerdict]);

  if (!currentVerdict || !currentTrade) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No verdict available</Text>
        <Button title="Go Back" onPress={() => router.back()} variant="secondary" />
      </View>
    );
  }

  const verdictColors = getVerdictColors(currentVerdict.level);
  const ps = currentVerdict.positionSizing;
  const isProceedOrAdjust = currentVerdict.level === 'proceed' || currentVerdict.level === 'adjust';

  const handleLog = (followed: boolean) => {
    // If overriding a WAIT/STOP verdict, require a reason
    if (!followed && !isProceedOrAdjust && !showOverrideConfirm) {
      setShowOverrideConfirm(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    const record: TradeRecord = {
      id: generateId(),
      trade: currentTrade as ProposedTrade,
      verdict: currentVerdict,
      decision: followed ? 'followed' : 'overrode',
      isPlanned: isPlanned,
      entryEmotion: selectedEmotion || undefined,
      entryNote: note || undefined,
      setupTag: selectedSetup || undefined,
      overrideReason: !followed ? overrideReason || undefined : undefined,
      // "followed" on proceed/adjust → active trade
      // "followed" on wait/stop (I'll Pass) → cancelled (user chose not to trade)
      // "overrode" on wait/stop → active trade (user overrode the warning)
      status: isProceedOrAdjust
        ? (followed ? 'active' : 'cancelled')
        : (followed ? 'cancelled' : 'active'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addRecord(record);
    // Also add to checked trades list for session tracking
    addCheckedTrade(currentTrade as ProposedTrade, currentVerdict);
    clearCurrent();
    router.dismissAll();
  };

  const handleCheckAnother = () => {
    // Save this check to the list, go back to enter another trade
    addCheckedTrade(currentTrade as ProposedTrade, currentVerdict);
    clearCurrent();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/checkpoint/enter-trade');
  };

  const riskScoreColor = currentVerdict.overallRiskScore <= 40
    ? colors.verdictProceed
    : currentVerdict.overallRiskScore <= 65
    ? colors.verdictAdjust
    : currentVerdict.overallRiskScore <= 80
    ? colors.verdictWait
    : colors.verdictStop;

  const rulesPassedCount = currentVerdict.ruleEvaluations.filter((r) => r.passed).length;
  const rulesTotal = currentVerdict.ruleEvaluations.length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Verdict Badge + Trade Info (merged header) ─── */}
        <Animated.View entering={ZoomIn.delay(100).duration(400).springify()} style={styles.headerSection}>
          <View style={[styles.verdictBadge, { backgroundColor: verdictColors.main }]}
            accessibilityRole="image" accessibilityLabel={`Verdict: ${verdictColors.label}`}>
            <VerdictIcon level={currentVerdict.level} />
          </View>
          <Text style={[styles.verdictLabel, { color: verdictColors.main }]} accessibilityRole="header">
            {verdictColors.label.toUpperCase()}
          </Text>
          <Text style={styles.tradeTitle}>
            {currentTrade.direction?.toUpperCase()} {currentTrade.ticker}
          </Text>
          <Text style={styles.tradePrices}>
            Entry {formatCurrency(currentTrade.entryPrice || 0)} · Stop {formatCurrency(currentTrade.stopLossPrice || 0)}
            {currentTrade.takeProfitPrice ? ` · TP ${formatCurrency(currentTrade.takeProfitPrice)}` : ''}
          </Text>
          <Text style={styles.verdictMessage}>{currentVerdict.message}</Text>
        </Animated.View>

        {/* ── Risk Score + Position (compact row) ─── */}
        <Animated.View entering={FadeInDown.delay(250).duration(350)}>
          <Card style={styles.metricsCard}>
            <View style={styles.metricsRow}>
              {/* Risk Score */}
              <View style={styles.metricBlock}>
                <Text style={styles.metricLabel}>Risk Score</Text>
                <Text style={[styles.metricValue, { color: riskScoreColor }]}>
                  {currentVerdict.overallRiskScore}
                  <Text style={styles.metricMax}>/100</Text>
                </Text>
                <View style={styles.miniBar}>
                  <View style={[styles.miniBarFill, {
                    width: `${currentVerdict.overallRiskScore}%`,
                    backgroundColor: riskScoreColor,
                  }]} />
                </View>
              </View>

              <View style={styles.metricDivider} />

              {/* Position Size */}
              <View style={styles.metricBlock}>
                <Text style={styles.metricLabel}>Position</Text>
                <Text style={styles.metricValue}>
                  {ps.recommendedShares}
                  <Text style={styles.metricMax}> shares</Text>
                </Text>
                <Text style={styles.metricSub}>
                  {formatCurrency(ps.recommendedDollarAmount)} · {formatPercent(ps.riskPercent)} risk
                </Text>
              </View>

              {/* R:R if available */}
              {ps.riskRewardRatio > 0 && (
                <>
                  <View style={styles.metricDivider} />
                  <View style={styles.metricBlock}>
                    <Text style={styles.metricLabel}>R:R</Text>
                    <Text style={[styles.metricValue, {
                      color: ps.riskRewardRatio >= 2 ? colors.verdictProceed
                        : ps.riskRewardRatio >= 1 ? colors.verdictAdjust
                        : colors.verdictStop,
                    }]}>
                      1:{ps.riskRewardRatio.toFixed(1)}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {ps.adjustedForExposure && ps.adjustmentReason && (
              <View style={styles.adjustmentNote}>
                <Text style={styles.adjustmentText}>
                  ⚠️ Reduced from {ps.originalShares} shares — {ps.adjustmentReason}
                </Text>
              </View>
            )}
          </Card>
        </Animated.View>

        {/* ── Rule Checklist ─── */}
        <Animated.View entering={FadeInDown.delay(400).duration(350)}>
          <Card>
            <View style={styles.ruleListHeader}>
              <Text style={styles.cardTitle}>Rule Check</Text>
              <Text style={[styles.ruleScore, {
                color: rulesPassedCount === rulesTotal ? colors.verdictProceed : colors.verdictAdjust,
              }]}>
                {rulesPassedCount}/{rulesTotal} passed
              </Text>
            </View>
            <View style={styles.ruleList}>
              {currentVerdict.ruleEvaluations.map((rule) => (
                <RuleCheckItem
                  key={rule.ruleId}
                  name={rule.ruleName}
                  passed={rule.passed}
                  severity={rule.severity}
                  message={rule.message}
                  currentValue={rule.currentValue}
                  limitValue={rule.limitValue}
                />
              ))}
            </View>
          </Card>
        </Animated.View>

        {/* ── Journal Section (collapsible) ─── */}
        <Animated.View entering={FadeInDown.delay(500).duration(350)}>
          <TouchableOpacity
            style={styles.journalToggle}
            onPress={() => {
              setShowJournal(!showJournal);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.journalToggleText}>
              {showJournal ? '▾ Journal Details' : '▸ Add Journal Details'}
            </Text>
            <Text style={styles.journalToggleHint}>
              {!showJournal ? 'emotion · setup · notes' : ''}
            </Text>
          </TouchableOpacity>

          {showJournal && (
            <Card style={styles.journalCard}>
              {/* Emotion Tag Selector */}
              <Text style={styles.journalLabel}>How are you feeling?</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {EMOTION_OPTIONS.map((option) => {
                  const isSelected = selectedEmotion === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.emotionChip, isSelected && styles.emotionChipSelected]}
                      onPress={() => setSelectedEmotion(isSelected ? null : option.value)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`${option.label} emotion`}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text style={styles.emotionEmoji}>{option.emoji}</Text>
                      <Text style={[styles.emotionLabel, isSelected && styles.emotionLabelSelected]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Setup Tag Selector */}
              <Text style={styles.journalLabel}>Setup Type</Text>
              <View style={styles.setupWrap}>
                {SETUP_OPTIONS.map((option) => {
                  const isSelected = selectedSetup === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.setupChip, isSelected && styles.setupChipSelected]}
                      onPress={() => setSelectedSetup(isSelected ? null : option.value)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`${option.label} setup`}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text style={[styles.setupLabel, isSelected && styles.setupLabelSelected]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Planned / Unplanned Toggle */}
              <Text style={styles.journalLabel}>Trade Plan</Text>
              <View style={styles.toggleRow} accessibilityRole="radiogroup" accessibilityLabel="Trade plan type">
                <TouchableOpacity
                  style={[styles.toggleBtn, styles.toggleBtnLeft, isPlanned && styles.toggleBtnActive]}
                  onPress={() => setIsPlanned(true)}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityLabel="Planned trade"
                  accessibilityState={{ checked: isPlanned }}
                >
                  <Text style={[styles.toggleText, isPlanned && styles.toggleTextActive]}>Planned</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, styles.toggleBtnRight, !isPlanned && styles.toggleBtnActive]}
                  onPress={() => setIsPlanned(false)}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityLabel="Unplanned trade"
                  accessibilityState={{ checked: !isPlanned }}
                >
                  <Text style={[styles.toggleText, !isPlanned && styles.toggleTextActive]}>Unplanned</Text>
                </TouchableOpacity>
              </View>

              {/* Quick Note */}
              <Text style={styles.journalLabel}>Quick Note</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="Optional note about this trade..."
                placeholderTextColor={colors.textMuted}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={2}
                maxLength={280}
                textAlignVertical="top"
                accessibilityLabel="Trade note"
                accessibilityHint="Optional note about this trade"
              />
            </Card>
          )}
        </Animated.View>
      </ScrollView>

      {/* Override Reason Section — shown when overriding WAIT/STOP */}
      {showOverrideConfirm && (
        <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.overrideSection}>
          <Card style={styles.overrideCard}>
            <View style={styles.overrideWarning}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path d="M12 9v4M12 17h.01" stroke={colors.verdictStop} strokeWidth={2.5} strokeLinecap="round" />
                <Path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke={colors.verdictStop} strokeWidth={2} />
              </Svg>
              <Text style={styles.overrideWarningText}>
                Why are you overriding?
              </Text>
            </View>
            <Text style={styles.overrideSubtext}>
              This will be tracked in your accountability log.
            </Text>
            <View style={styles.overrideReasonWrap}>
              {OVERRIDE_REASON_OPTIONS.map((option) => {
                const isSelected = overrideReason === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.overrideChip, isSelected && styles.overrideChipSelected]}
                    onPress={() => {
                      setOverrideReason(isSelected ? null : option.value);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`${option.label} override reason`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={styles.overrideEmoji}>{option.emoji}</Text>
                    <Text style={[styles.overrideLabel, isSelected && styles.overrideLabelSelected]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>
        </Animated.View>
      )}

      {/* ── Action Buttons ─── */}
      <Animated.View entering={FadeInUp.delay(600).duration(350)} style={styles.actions}>
        {showOverrideConfirm ? (
          <>
            <Button
              title="Override & Trade Anyway"
              variant="danger"
              onPress={() => handleLog(false)}
              disabled={!overrideReason}
            />
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => {
              setShowOverrideConfirm(false);
              setOverrideReason(null);
            }} activeOpacity={0.7}>
              <Text style={styles.secondaryBtnText}>Never Mind</Text>
            </TouchableOpacity>
          </>
        ) : isProceedOrAdjust ? (
          <>
            <Button title="Add to Trades" onPress={() => handleLog(true)} />
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleCheckAnother} activeOpacity={0.7}>
              <Text style={styles.secondaryBtnText}>Check Another</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Button title="I'll Pass" onPress={() => handleLog(true)} />
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleCheckAnother} activeOpacity={0.7}>
              <Text style={styles.secondaryBtnText}>Check Another</Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxxl },
  errorText: {
    fontSize: typography.md,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 100,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },

  // ── Header (verdict badge + trade info merged)
  headerSection: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  verdictBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  verdictLabel: {
    fontSize: typography.lg,
    fontFamily: typography.bold,
    letterSpacing: 2,
    marginTop: spacing.xs,
  },
  tradeTitle: {
    fontSize: typography.md,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },
  tradePrices: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },
  verdictMessage: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },

  // ── Metrics (risk score + position compact)
  metricsCard: { gap: spacing.xs },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metricLabel: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: typography.lg,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  metricMax: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },
  metricSub: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },
  metricDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  miniBar: {
    width: '80%',
    height: 3,
    backgroundColor: colors.surfaceHover,
    borderRadius: 1.5,
    overflow: 'hidden',
    marginTop: 2,
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  adjustmentNote: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  adjustmentText: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.verdictAdjust,
    textAlign: 'center',
  },

  // ── Rule Checklist
  cardTitle: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ruleListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  ruleScore: {
    fontSize: typography.sm,
    fontFamily: typography.bold,
  },
  ruleList: { gap: spacing.md },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  ruleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  ruleContent: { flex: 1, gap: 3 },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ruleName: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },
  ruleValues: {
    fontSize: typography.xs,
    fontFamily: typography.bold,
  },
  ruleBar: {
    height: 3,
    backgroundColor: colors.surfaceHover,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  ruleBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  ruleMessage: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
  },

  // ── Journal Toggle
  journalToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  journalToggleText: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.primary,
  },
  journalToggleHint: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },

  // ── Journal Card
  journalCard: {
    gap: spacing.xs,
  },
  journalLabel: {
    fontSize: typography.xs,
    fontFamily: typography.semiBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },

  // Emotion Chips
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  emotionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emotionChipSelected: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  emotionEmoji: { fontSize: 14 },
  emotionLabel: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  emotionLabelSelected: {
    color: colors.primaryLight,
    fontFamily: typography.semiBold,
  },

  // Setup Chips
  setupWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  setupChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.transparent,
  },
  setupChipSelected: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  setupLabel: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  setupLabelSelected: {
    color: colors.primaryLight,
    fontFamily: typography.semiBold,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.transparent,
  },
  toggleBtnLeft: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  toggleBtnRight: {},
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.white,
  },

  // Note
  noteInput: {
    backgroundColor: colors.surfaceHover,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textPrimary,
    minHeight: 56,
    maxHeight: 72,
  },

  // ── Override Section
  overrideSection: {
    paddingHorizontal: spacing.xl,
  },
  overrideCard: {
    backgroundColor: colors.verdictStop + '08',
    borderColor: colors.verdictStop + '30',
    gap: spacing.sm,
  },
  overrideWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  overrideWarningText: {
    fontSize: typography.sm,
    fontFamily: typography.bold,
    color: colors.verdictStop,
    flex: 1,
  },
  overrideSubtext: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },
  overrideReasonWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  overrideChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overrideChipSelected: {
    backgroundColor: colors.verdictStop + '20',
    borderColor: colors.verdictStop,
  },
  overrideEmoji: { fontSize: 13 },
  overrideLabel: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  overrideLabelSelected: {
    color: colors.verdictStop,
    fontFamily: typography.semiBold,
  },

  // ── Actions
  actions: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  secondaryBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.primary,
  },
});
