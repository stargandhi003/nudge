import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, BounceIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, radii } from '../../src/theme';
import { Button, Card } from '../../src/components/ui';
import { useAppStore } from '../../src/stores/useAppStore';
import { useUserStore } from '../../src/stores/useUserStore';
import { useRulesStore } from '../../src/stores/useRulesStore';
import { formatCurrency, formatPercent } from '../../src/utils/formatting';
import { Svg, Path } from 'react-native-svg';

function CheckCircle() {
  return (
    <View style={styles.checkCircle}>
      <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
        <Path d="M9 12l2 2 4-4" stroke={colors.verdictProceed} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

function RuleSummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

export default function ConfirmationScreen() {
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);
  const profile = useUserStore((s) => s.profile);
  const rules = useRulesStore((s) => s.rules);
  const accountSize = profile?.accountSize ?? 0;
  const userName = profile?.name ?? '';

  const handleStart = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setOnboardingComplete(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: '100%' }]} />
      </View>

      <View style={styles.content}>
        <Animated.View entering={BounceIn.delay(300).duration(600)} style={styles.checkContainer}>
          <CheckCircle />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500).duration(500)}>
          <Text style={styles.title}>You're all set{userName ? `, ${userName}` : ''}!</Text>
          <Text style={styles.description}>Here's a summary of your trading rules.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(700).duration(500)}>
          <Card>
            <RuleSummaryRow label="Account Size" value={formatCurrency(accountSize)} />
            <View style={styles.divider} />
            <RuleSummaryRow
              label="Max Risk / Trade"
              value={`${formatPercent(rules.maxRiskPerTrade)} (${formatCurrency((rules.maxRiskPerTrade / 100) * accountSize)})`}
            />
            <View style={styles.divider} />
            <RuleSummaryRow
              label="Daily Loss Limit"
              value={`${formatPercent(rules.dailyLossLimit)} (${formatCurrency((rules.dailyLossLimit / 100) * accountSize)})`}
            />
            <View style={styles.divider} />
            <RuleSummaryRow label="Max Positions" value={`${rules.maxOpenPositions}`} />
            <View style={styles.divider} />
            <RuleSummaryRow label="Sector Exposure" value={formatPercent(rules.maxSectorExposure)} />
            <View style={styles.divider} />
            <RuleSummaryRow label="Single Stock Max" value={formatPercent(rules.maxSingleStockAllocation)} />
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(900).duration(500)}>
          <Text style={styles.hint}>You can change these anytime in Settings</Text>
        </Animated.View>
      </View>

      <View style={styles.bottom}>
        <Button title="Start Using Nudge" onPress={handleStart} />
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
    backgroundColor: colors.verdictProceed,
    borderRadius: radii.full,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    gap: spacing.xl,
  },
  checkContainer: { alignItems: 'center', marginTop: spacing.xxl },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.verdictProceedBg,
    borderWidth: 2,
    borderColor: colors.verdictProceed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.xxl,
    fontFamily: typography.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    fontSize: typography.base,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  summaryLabel: {
    fontSize: typography.base,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: typography.base,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  hint: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textMuted,
    textAlign: 'center',
  },
  bottom: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
});
