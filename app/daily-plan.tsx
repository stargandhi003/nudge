import { useState } from 'react';
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
import { EMOTION_OPTIONS, MARKET_BIAS_OPTIONS, EmotionTag, MarketBias } from '../src/types/models';
import { useDailyPlanStore } from '../src/stores/useDailyPlanStore';
import { useStreakStore } from '../src/stores/useStreakStore';
import { generateId } from '../src/utils/uuid';
import { format } from 'date-fns';

export default function DailyPlanScreen() {
  const router = useRouter();
  const { getTodayPlan, addPlan, updatePlan } = useDailyPlanStore();
  const { recordCompletion } = useStreakStore();

  // Derive today's date string (YYYY-MM-DD, local)
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Check for existing plan
  const existingPlan = getTodayPlan();
  const isEditing = !!existingPlan;

  // ─── Form State ────────────────────────────────────────────────
  const [mood, setMood] = useState<EmotionTag | null>(existingPlan?.mood ?? null);
  const [marketBias, setMarketBias] = useState<MarketBias | null>(existingPlan?.marketBias ?? null);
  const [tickers, setTickers] = useState<string[]>(
    existingPlan?.watchlist?.length ? existingPlan.watchlist : ['']
  );
  const [intention, setIntention] = useState(existingPlan?.intention ?? '');

  // ─── Ticker Helpers ────────────────────────────────────────────
  const updateTicker = (index: number, value: string) => {
    const updated = [...tickers];
    updated[index] = value.toUpperCase();
    setTickers(updated);
  };

  const addTicker = () => {
    if (tickers.length < 5) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTickers([...tickers, '']);
    }
  };

  const removeTicker = (index: number) => {
    if (tickers.length <= 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = tickers.filter((_, i) => i !== index);
    setTickers(updated);
  };

  // ─── Chip Selection Handlers ───────────────────────────────────
  const selectMood = (value: EmotionTag) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMood(value);
  };

  const selectBias = (value: MarketBias) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMarketBias(marketBias === value ? null : value);
  };

  // ─── Save Handler ──────────────────────────────────────────────
  const canSave = mood !== null;

  const handleSave = () => {
    if (!canSave) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Filter out empty tickers
    const cleanTickers = tickers.map((t) => t.trim()).filter((t) => t.length > 0);
    const nowIso = new Date().toISOString();

    if (isEditing && existingPlan) {
      updatePlan(existingPlan.id, {
        mood,
        marketBias: marketBias ?? undefined,
        watchlist: cleanTickers,
        intention: intention.trim(),
      });
    } else {
      addPlan({
        id: generateId(),
        date: todayStr,
        mood,
        marketBias: marketBias ?? undefined,
        watchlist: cleanTickers,
        intention: intention.trim(),
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }

    // Record plan streak
    recordCompletion('plan');

    router.back();
  };

  // ─── Formatted Date Display ────────────────────────────────────
  const displayDate = format(now, 'EEEE, MMM d');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Plan Your Day</Text>
            <Text style={styles.headerDate}>{displayDate}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.closeButton}
          >
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path
                d="M18 6L6 18M6 6l12 12"
                stroke={colors.textSecondary}
                strokeWidth={2}
                strokeLinecap="round"
              />
            </Svg>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Mood Selector ─────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.section}>
            <Text style={styles.sectionLabel}>How are you feeling?</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipScrollContent}
            >
              {EMOTION_OPTIONS.map((option) => {
                const isSelected = mood === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => selectMood(option.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.chipEmoji}>{option.emoji}</Text>
                    <Text
                      style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>

          {/* ── Market Bias ───────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.section}>
            <Text style={styles.sectionLabel}>Market bias</Text>
            <View style={styles.biasRow}>
              {MARKET_BIAS_OPTIONS.map((option) => {
                const isSelected = marketBias === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.chip, styles.biasChip, isSelected && styles.chipSelected]}
                    onPress={() => selectBias(option.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.chipEmoji}>{option.emoji}</Text>
                    <Text
                      style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>

          {/* ── Watchlist ─────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(190).duration(400)} style={styles.section}>
            <Text style={styles.sectionLabel}>What are you watching?</Text>
            <View style={styles.tickerList}>
              {tickers.map((ticker, index) => (
                <View key={index} style={styles.tickerRow}>
                  <TextInput
                    style={styles.tickerInput}
                    value={ticker}
                    onChangeText={(val) => updateTicker(index, val)}
                    placeholder="AAPL"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={10}
                    selectionColor={colors.primary}
                  />
                  {tickers.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeTicker(index)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.tickerRemove}
                    >
                      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M18 6L6 18M6 6l12 12"
                          stroke={colors.textMuted}
                          strokeWidth={2}
                          strokeLinecap="round"
                        />
                      </Svg>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
            {tickers.length < 5 && (
              <TouchableOpacity style={styles.addTickerBtn} onPress={addTicker} activeOpacity={0.7}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 5v14M5 12h14"
                    stroke={colors.primary}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </Svg>
                <Text style={styles.addTickerText}>Add ticker</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* ── Daily Intention ───────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(260).duration(400)} style={styles.section}>
            <Text style={styles.sectionLabel}>One intention for today</Text>
            <TextInput
              style={styles.intentionInput}
              value={intention}
              onChangeText={setIntention}
              placeholder="Only A+ setups today..."
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={140}
              textAlignVertical="top"
              selectionColor={colors.primary}
            />
            <Text style={styles.charCount}>
              {intention.length}/140
            </Text>
          </Animated.View>
        </ScrollView>

        {/* ── Save Button ────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(330).duration(400)} style={styles.bottom}>
          <TouchableOpacity
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.8}
          >
            <Text style={[styles.saveButtonText, !canSave && styles.saveButtonTextDisabled]}>
              {isEditing ? 'Update Plan' : 'Save Plan'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerLeft: {
    flex: 1,
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.xl,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  headerDate: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  closeButton: {
    padding: spacing.xs,
    marginTop: spacing.xs,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },

  // Sections
  section: {
    gap: spacing.md,
  },
  sectionLabel: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Chip styles (shared by mood + bias)
  chipScrollContent: {
    gap: spacing.sm,
    paddingRight: spacing.xl,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  chipSelected: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  chipEmoji: {
    fontSize: typography.base,
  },
  chipLabel: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textSecondary,
  },
  chipLabelSelected: {
    color: colors.textPrimary,
  },

  // Market bias row
  biasRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  biasChip: {
    flex: 1,
    justifyContent: 'center',
  },

  // Ticker inputs
  tickerList: {
    gap: spacing.sm,
  },
  tickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tickerInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.base,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  tickerRemove: {
    padding: spacing.sm,
  },
  addTickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  addTickerText: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.primary,
  },

  // Intention input
  intentionInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    fontSize: typography.base,
    fontFamily: typography.regular,
    color: colors.textPrimary,
    minHeight: 100,
    lineHeight: 22,
  },
  charCount: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
    textAlign: 'right',
  },

  // Bottom save
  bottom: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colors.surfaceElevated,
  },
  saveButtonText: {
    fontSize: typography.md,
    fontFamily: typography.bold,
    color: colors.white,
  },
  saveButtonTextDisabled: {
    color: colors.textMuted,
  },
});
