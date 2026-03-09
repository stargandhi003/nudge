import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, radii } from '../../src/theme';
import { Button, Card } from '../../src/components/ui';
import { useTradeRecordStore } from '../../src/stores/useTradeRecordStore';
import { TradeOutcome, EmotionTag, EMOTION_OPTIONS } from '../../src/types/models';
import { formatCurrency } from '../../src/utils/formatting';
import { Svg, Path } from 'react-native-svg';

// ─── Outcome chip configuration ─────────────────────────────────
const OUTCOME_OPTIONS: { value: TradeOutcome; label: string; color: string }[] = [
  { value: 'tp_hit', label: 'Hit TP', color: colors.verdictProceed },
  { value: 'sl_hit', label: 'Hit SL', color: colors.verdictStop },
  { value: 'manual_exit', label: 'Manual Exit', color: colors.verdictWait },
  { value: 'breakeven', label: 'Breakeven', color: colors.textSecondary },
];

export default function CloseTradeScreen() {
  const router = useRouter();
  const { id: tradeId } = useLocalSearchParams<{ id: string }>();

  const records = useTradeRecordStore((s) => s.records);
  const closeTrade = useTradeRecordStore((s) => s.closeTrade);

  const record = records.find((r) => r.id === tradeId);

  // ─── Local state ────────────────────────────────────────────────
  const [exitPriceStr, setExitPriceStr] = useState('');
  const [selectedOutcome, setSelectedOutcome] = useState<TradeOutcome | null>(null);
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionTag | null>(null);
  const [exitNote, setExitNote] = useState('');

  // ─── Guard: no record found ─────────────────────────────────────
  if (!record) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path d="M18 6L6 18M6 6l12 12" stroke={colors.textSecondary} strokeWidth={2} strokeLinecap="round" />
            </Svg>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Close Trade</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Trade not found</Text>
          <Button title="Go Back" variant="secondary" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Derived trade info ─────────────────────────────────────────
  const { trade } = record;
  const directionMultiplier = trade.direction === 'buy' ? 1 : -1;
  const exitPrice = parseFloat(exitPriceStr);
  const hasExitPrice = !isNaN(exitPrice) && exitPrice > 0;

  // P&L calculation
  const pnlDollars = hasExitPrice
    ? (exitPrice - trade.entryPrice) * directionMultiplier * trade.quantity
    : 0;
  const riskPerShare = trade.riskPerShare;
  const totalRisk = riskPerShare * trade.quantity;
  const pnlR = hasExitPrice && totalRisk > 0
    ? pnlDollars / totalRisk
    : 0;
  const isProfit = pnlDollars > 0;
  const isLoss = pnlDollars < 0;
  const pnlColor = isProfit ? colors.verdictProceed : isLoss ? colors.verdictStop : colors.textSecondary;

  // Validation
  const isValid = hasExitPrice && selectedOutcome !== null;

  // ─── Handlers ───────────────────────────────────────────────────
  const handleSelectOutcome = (outcome: TradeOutcome) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOutcome(outcome === selectedOutcome ? null : outcome);
  };

  const handleSelectEmotion = (emotion: EmotionTag) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEmotion(emotion === selectedEmotion ? null : emotion);
  };

  const handleCloseTrade = () => {
    if (!isValid || !tradeId || !selectedOutcome) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    closeTrade(tradeId, {
      exitPrice: parseFloat(exitPriceStr),
      tradeOutcome: selectedOutcome,
      exitEmotion: selectedEmotion || undefined,
      exitNote: exitNote || undefined,
    });

    router.back();
  };

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M18 6L6 18M6 6l12 12" stroke={colors.textSecondary} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Close Trade</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Trade Summary ──────────────────────────────────────── */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryTickerRow}>
              <Text style={styles.summaryTicker}>{trade.ticker}</Text>
              <View style={[
                styles.directionBadge,
                trade.direction === 'buy' ? styles.directionBadgeBuy : styles.directionBadgeSell,
              ]}>
                <Text style={[
                  styles.directionBadgeText,
                  trade.direction === 'buy' ? styles.directionBadgeTextBuy : styles.directionBadgeTextSell,
                ]}>
                  {trade.direction.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.summaryQty}>{trade.quantity} shares</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Entry</Text>
              <Text style={styles.summaryItemValue}>{formatCurrency(trade.entryPrice)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Stop Loss</Text>
              <Text style={[styles.summaryItemValue, { color: colors.verdictStop }]}>
                {formatCurrency(trade.stopLossPrice)}
              </Text>
            </View>
            {trade.takeProfitPrice != null && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Take Profit</Text>
                <Text style={[styles.summaryItemValue, { color: colors.verdictProceed }]}>
                  {formatCurrency(trade.takeProfitPrice)}
                </Text>
              </View>
            )}
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Risk/Share</Text>
              <Text style={styles.summaryItemValue}>{formatCurrency(riskPerShare)}</Text>
            </View>
          </View>
        </Card>

        {/* ── Exit Price ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Exit Price</Text>
          <View style={styles.priceInputContainer}>
            <Text style={styles.pricePrefix}>$</Text>
            <TextInput
              style={styles.priceInput}
              value={exitPriceStr}
              onChangeText={setExitPriceStr}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              selectionColor={colors.primary}
            />
          </View>
        </View>

        {/* ── P&L Preview ────────────────────────────────────────── */}
        {hasExitPrice && (
          <Card
            style={styles.pnlCard}
            variant="verdict"
            verdictColor={isProfit ? colors.verdictProceedBg : isLoss ? colors.verdictStopBg : colors.surface}
            verdictBorderColor={isProfit ? colors.verdictProceedBorder : isLoss ? colors.verdictStopBorder : colors.border}
          >
            <Text style={styles.pnlTitle}>P&L Preview</Text>
            <View style={styles.pnlRow}>
              <View style={styles.pnlBlock}>
                <Text style={[styles.pnlValue, { color: pnlColor }]}>
                  {pnlDollars >= 0 ? '+' : ''}{formatCurrency(pnlDollars)}
                </Text>
                <Text style={styles.pnlSubLabel}>Dollar P&L</Text>
              </View>
              <View style={styles.pnlDivider} />
              <View style={styles.pnlBlock}>
                <Text style={[styles.pnlValue, { color: pnlColor }]}>
                  {pnlR >= 0 ? '+' : ''}{pnlR.toFixed(2)}R
                </Text>
                <Text style={styles.pnlSubLabel}>R-Multiple</Text>
              </View>
            </View>
          </Card>
        )}

        {/* ── Outcome ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Outcome</Text>
          <View style={styles.chipRow}>
            {OUTCOME_OPTIONS.map((opt) => {
              const isSelected = selectedOutcome === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.outcomeChip,
                    isSelected && { backgroundColor: opt.color + '20', borderColor: opt.color },
                  ]}
                  onPress={() => handleSelectOutcome(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.outcomeChipText,
                    isSelected && { color: opt.color },
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Exit Emotion ───────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Exit Emotion</Text>
          <View style={styles.emotionGrid}>
            {EMOTION_OPTIONS.map((opt) => {
              const isSelected = selectedEmotion === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.emotionChip,
                    isSelected && styles.emotionChipSelected,
                  ]}
                  onPress={() => handleSelectEmotion(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emotionEmoji}>{opt.emoji}</Text>
                  <Text style={[
                    styles.emotionLabel,
                    isSelected && styles.emotionLabelSelected,
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Exit Note ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Exit Note (Optional)</Text>
          <View style={styles.noteContainer}>
            <TextInput
              style={styles.noteInput}
              value={exitNote}
              onChangeText={setExitNote}
              placeholder="What did you learn from this trade?"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
              selectionColor={colors.primary}
            />
          </View>
        </View>
      </ScrollView>

      {/* ── Bottom CTA ───────────────────────────────────────────── */}
      <View style={styles.bottom}>
        <Button
          title="Close Trade"
          onPress={handleCloseTrade}
          disabled={!isValid}
          variant={isValid ? (isLoss ? 'danger' : 'primary') : 'primary'}
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: typography.md,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  // Section
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ─── Trade Summary Card ────────────────────────────────────────
  summaryCard: {
    gap: spacing.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryTicker: {
    fontSize: typography.xl,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  directionBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  directionBadgeBuy: {
    backgroundColor: colors.verdictProceed + '15',
    borderColor: colors.verdictProceed + '40',
  },
  directionBadgeSell: {
    backgroundColor: colors.verdictStop + '15',
    borderColor: colors.verdictStop + '40',
  },
  directionBadgeText: {
    fontSize: typography.xs,
    fontFamily: typography.bold,
    letterSpacing: 0.5,
  },
  directionBadgeTextBuy: {
    color: colors.verdictProceed,
  },
  directionBadgeTextSell: {
    color: colors.verdictStop,
  },
  summaryQty: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryItem: {
    width: '47%',
    gap: 2,
  },
  summaryItemLabel: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },
  summaryItemValue: {
    fontSize: typography.base,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },

  // ─── Exit Price Input ──────────────────────────────────────────
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pricePrefix: {
    fontSize: typography.lg,
    fontFamily: typography.semiBold,
    color: colors.textMuted,
    marginRight: spacing.xs,
  },
  priceInput: {
    flex: 1,
    fontSize: typography.lg,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
    padding: 0,
  },

  // ─── P&L Preview Card ─────────────────────────────────────────
  pnlCard: {
    gap: spacing.md,
  },
  pnlTitle: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pnlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  pnlBlock: {
    flex: 1,
    alignItems: 'center',
  },
  pnlValue: {
    fontSize: typography.xxl,
    fontFamily: typography.bold,
  },
  pnlSubLabel: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  pnlDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },

  // ─── Outcome Chips ─────────────────────────────────────────────
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  outcomeChip: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  outcomeChipText: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textMuted,
  },

  // ─── Emotion Chips ─────────────────────────────────────────────
  emotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  emotionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  emotionChipSelected: {
    backgroundColor: colors.primary + '18',
    borderColor: colors.primary,
  },
  emotionEmoji: {
    fontSize: typography.base,
  },
  emotionLabel: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textMuted,
  },
  emotionLabelSelected: {
    color: colors.textPrimary,
  },

  // ─── Exit Note ─────────────────────────────────────────────────
  noteContainer: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  noteInput: {
    fontFamily: typography.regular,
    fontSize: typography.base,
    color: colors.textPrimary,
    minHeight: 56,
    padding: 0,
  },

  // ─── Bottom ────────────────────────────────────────────────────
  bottom: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },

  // ─── Empty State ───────────────────────────────────────────────
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  emptyText: {
    fontSize: typography.md,
    fontFamily: typography.semiBold,
    color: colors.textSecondary,
  },
});
