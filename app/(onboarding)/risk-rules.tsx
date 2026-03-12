import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
import { colors, typography, spacing, radii } from '../../src/theme';
import { Button, Card } from '../../src/components/ui';
import { useRulesStore } from '../../src/stores/useRulesStore';
import { useUserStore } from '../../src/stores/useUserStore';
import { formatCurrency, formatPercent } from '../../src/utils/formatting';
import { RULE_LIMITS } from '../../src/utils/constants';

function RuleCard({
  title,
  description,
  value,
  onValueChange,
  min,
  max,
  step,
  suffix,
  dollarEquivalent,
  delay,
}: {
  title: string;
  description: string;
  value: number;
  onValueChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  suffix: string;
  dollarEquivalent?: string;
  delay: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(500)}>
      <Card>
        <View style={styles.ruleHeader}>
          <Text style={styles.ruleTitle}>{title}</Text>
          <Text style={styles.ruleValue}>
            {suffix === '%' ? formatPercent(value, step < 1 ? 1 : 0) : value}
          </Text>
        </View>
        <Text style={styles.ruleDescription}>{description}</Text>
        {dollarEquivalent && (
          <Text style={styles.dollarEquiv}>{dollarEquivalent}</Text>
        )}
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={min}
            maximumValue={max}
            step={step}
            value={value}
            onValueChange={onValueChange}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.surfaceHover}
            thumbTintColor={colors.primary}
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>{min}{suffix}</Text>
            <Text style={styles.sliderLabel}>{max}{suffix}</Text>
          </View>
        </View>
      </Card>
    </Animated.View>
  );
}

export default function RiskRulesScreen() {
  const router = useRouter();
  const { rules, updateRule } = useRulesStore();
  const accountSize = useUserStore((s) => s.profile?.accountSize ?? 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: '75%' }]} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={styles.stepLabel}>Step 3 of 4</Text>
          <Text style={styles.title}>Your Risk Rules</Text>
          <Text style={styles.description}>
            These are your guardrails. Nudge will check every trade against them.
          </Text>
        </Animated.View>

        <RuleCard
          title="Max Risk Per Trade"
          description="Maximum percentage of your account to risk on a single trade"
          value={rules.maxRiskPerTrade}
          onValueChange={(v) => updateRule('maxRiskPerTrade', Math.round(v * 10) / 10)}
          min={RULE_LIMITS.maxRiskPerTrade.min}
          max={RULE_LIMITS.maxRiskPerTrade.max}
          step={RULE_LIMITS.maxRiskPerTrade.step}
          suffix="%"
          dollarEquivalent={`That's ${formatCurrency((rules.maxRiskPerTrade / 100) * accountSize)} max risk per trade`}
          delay={400}
        />

        <RuleCard
          title="Daily Loss Limit"
          description="Stop trading if you've lost this much in a single day"
          value={rules.dailyLossLimit}
          onValueChange={(v) => updateRule('dailyLossLimit', Math.round(v * 10) / 10)}
          min={RULE_LIMITS.dailyLossLimit.min}
          max={RULE_LIMITS.dailyLossLimit.max}
          step={RULE_LIMITS.dailyLossLimit.step}
          suffix="%"
          dollarEquivalent={`That's ${formatCurrency((rules.dailyLossLimit / 100) * accountSize)} max daily loss`}
          delay={500}
        />

        <RuleCard
          title="Max Open Positions"
          description="Maximum number of trades you can have open at once"
          value={rules.maxOpenPositions}
          onValueChange={(v) => updateRule('maxOpenPositions', Math.round(v))}
          min={RULE_LIMITS.maxOpenPositions.min}
          max={RULE_LIMITS.maxOpenPositions.max}
          step={RULE_LIMITS.maxOpenPositions.step}
          suffix=""
          delay={600}
        />

        {/* Max Sector Exposure — with N/A toggle */}
        <Animated.View entering={FadeInDown.delay(700).duration(500)}>
          <Card>
            <View style={styles.ruleHeader}>
              <Text style={styles.ruleTitle}>Max Sector Exposure</Text>
              <TouchableOpacity
                style={[styles.naToggle, rules.maxSectorExposure === null && styles.naToggleActive]}
                onPress={() => updateRule('maxSectorExposure', rules.maxSectorExposure === null ? RULE_LIMITS.maxSectorExposure.default : null)}
                activeOpacity={0.7}
              >
                <Text style={[styles.naToggleText, rules.maxSectorExposure === null && styles.naToggleTextActive]}>N/A</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.ruleDescription}>Maximum percentage of your account in any single sector</Text>
            {rules.maxSectorExposure !== null ? (
              <>
                <Text style={styles.ruleValue}>{formatPercent(rules.maxSectorExposure, 0)}</Text>
                <Text style={styles.dollarEquiv}>{`That's ${formatCurrency((rules.maxSectorExposure / 100) * accountSize)} per sector`}</Text>
                <View style={styles.sliderContainer}>
                  <Slider
                    style={styles.slider}
                    minimumValue={RULE_LIMITS.maxSectorExposure.min}
                    maximumValue={RULE_LIMITS.maxSectorExposure.max}
                    step={RULE_LIMITS.maxSectorExposure.step}
                    value={rules.maxSectorExposure}
                    onValueChange={(v) => updateRule('maxSectorExposure', Math.round(v))}
                    minimumTrackTintColor={colors.primary}
                    maximumTrackTintColor={colors.surfaceHover}
                    thumbTintColor={colors.primary}
                  />
                  <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabel}>{RULE_LIMITS.maxSectorExposure.min}%</Text>
                    <Text style={styles.sliderLabel}>{RULE_LIMITS.maxSectorExposure.max}%</Text>
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.naLabel}>This rule is disabled</Text>
            )}
          </Card>
        </Animated.View>

        {/* Max Single Stock — with N/A toggle */}
        <Animated.View entering={FadeInDown.delay(800).duration(500)}>
          <Card>
            <View style={styles.ruleHeader}>
              <Text style={styles.ruleTitle}>Max Single Stock</Text>
              <TouchableOpacity
                style={[styles.naToggle, rules.maxSingleStockAllocation === null && styles.naToggleActive]}
                onPress={() => updateRule('maxSingleStockAllocation', rules.maxSingleStockAllocation === null ? RULE_LIMITS.maxSingleStockAllocation.default : null)}
                activeOpacity={0.7}
              >
                <Text style={[styles.naToggleText, rules.maxSingleStockAllocation === null && styles.naToggleTextActive]}>N/A</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.ruleDescription}>Maximum percentage of your account in a single stock</Text>
            {rules.maxSingleStockAllocation !== null ? (
              <>
                <Text style={styles.ruleValue}>{formatPercent(rules.maxSingleStockAllocation, 0)}</Text>
                <Text style={styles.dollarEquiv}>{`That's ${formatCurrency((rules.maxSingleStockAllocation / 100) * accountSize)} per stock`}</Text>
                <View style={styles.sliderContainer}>
                  <Slider
                    style={styles.slider}
                    minimumValue={RULE_LIMITS.maxSingleStockAllocation.min}
                    maximumValue={RULE_LIMITS.maxSingleStockAllocation.max}
                    step={RULE_LIMITS.maxSingleStockAllocation.step}
                    value={rules.maxSingleStockAllocation}
                    onValueChange={(v) => updateRule('maxSingleStockAllocation', Math.round(v))}
                    minimumTrackTintColor={colors.primary}
                    maximumTrackTintColor={colors.surfaceHover}
                    thumbTintColor={colors.primary}
                  />
                  <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabel}>{RULE_LIMITS.maxSingleStockAllocation.min}%</Text>
                    <Text style={styles.sliderLabel}>{RULE_LIMITS.maxSingleStockAllocation.max}%</Text>
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.naLabel}>This rule is disabled</Text>
            )}
          </Card>
        </Animated.View>
      </ScrollView>

      <View style={styles.bottom}>
        <Button title="Continue" onPress={() => router.push('/(onboarding)/confirmation')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  progressBar: {
    height: 3,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
    borderRadius: radii.full,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.xl, gap: spacing.lg },
  stepLabel: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: typography.xxl,
    fontFamily: typography.bold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  description: {
    fontSize: typography.base,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  ruleTitle: {
    fontSize: typography.base,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },
  ruleValue: {
    fontSize: typography.lg,
    fontFamily: typography.bold,
    color: colors.primary,
  },
  ruleDescription: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textMuted,
    lineHeight: 18,
  },
  dollarEquiv: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.verdictProceed,
    marginTop: spacing.sm,
  },
  sliderContainer: { marginTop: spacing.md },
  slider: { width: '100%', height: 40 },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -spacing.sm,
  },
  sliderLabel: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },
  naToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  naToggleActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  naToggleText: {
    fontSize: typography.xs,
    fontFamily: typography.bold,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  naToggleTextActive: {
    color: colors.primary,
  },
  naLabel: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  bottom: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
});
