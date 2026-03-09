import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { colors, typography, spacing } from '../../src/theme';
import { useTradeStore } from '../../src/stores/useTradeStore';
import { useRulesStore } from '../../src/stores/useRulesStore';
import { useUserStore } from '../../src/stores/useUserStore';
import { useTradeRecordStore } from '../../src/stores/useTradeRecordStore';
import { evaluateTrade } from '../../src/services/verdict/engine';
import { ProposedTrade, DailyStats } from '../../src/types/models';
import { Svg, Path, Circle } from 'react-native-svg';

const STEPS = [
  { text: 'Checking your rules...', icon: 'shield' },
  { text: 'Calculating position size...', icon: 'calc' },
  { text: 'Analyzing risk exposure...', icon: 'chart' },
];

function StepIcon({ type, active }: { type: string; active: boolean }) {
  const iconColor = active ? colors.primary : colors.textMuted;
  if (type === 'shield') {
    return (
      <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
        <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={iconColor} strokeWidth={2} />
      </Svg>
    );
  }
  if (type === 'calc') {
    return (
      <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
        <Path d="M4 4h16v16H4z" stroke={iconColor} strokeWidth={2} rx={2} />
        <Path d="M8 8h8M8 12h2M14 12h2" stroke={iconColor} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    );
  }
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path d="M3 15l4-4 3 3 4-4 4 4" stroke={iconColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 15V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10" stroke={iconColor} strokeWidth={2} />
    </Svg>
  );
}

export default function AnalysisScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const progress = useSharedValue(0);

  const currentTrade = useTradeStore((s) => s.currentTrade);
  const setCurrentVerdict = useTradeStore((s) => s.setCurrentVerdict);
  const rules = useRulesStore((s) => s.rules);
  const profile = useUserStore((s) => s.profile);
  const records = useTradeRecordStore((s) => s.records);
  const getActiveTrades = useTradeRecordStore((s) => s.getActiveTrades);

  const animatedProgress = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  useEffect(() => {
    // Animate through steps
    const timers: NodeJS.Timeout[] = [];

    timers.push(setTimeout(() => {
      setCurrentStep(1);
      progress.value = withTiming(0.33, { duration: 300 });
    }, 350));

    timers.push(setTimeout(() => {
      setCurrentStep(2);
      progress.value = withTiming(0.66, { duration: 300 });
    }, 700));

    timers.push(setTimeout(() => {
      progress.value = withTiming(1, { duration: 250 });

      // Run the actual verdict engine with real data from trade records
      if (currentTrade && profile) {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        // Build real daily stats from useTradeRecordStore
        const todayRecords = records.filter((r) => {
          const d = new Date(r.createdAt);
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          return dateStr === todayStr && r.status !== 'cancelled';
        });

        const activeTradesList = getActiveTrades();
        const closedToday = todayRecords.filter((r) => r.status === 'closed');
        const winsToday = closedToday.filter((r) => (r.pnlDollars ?? 0) > 0).length;
        const lossesToday = closedToday.filter((r) => (r.pnlDollars ?? 0) < 0).length;

        // Build sector exposure from active trades
        const sectorExposure: Record<string, number> = {};
        for (const r of activeTradesList) {
          const sector = r.trade.sector || 'Unknown';
          const alloc = profile.accountSize > 0 ? (r.trade.totalCost / profile.accountSize) * 100 : 0;
          sectorExposure[sector] = (sectorExposure[sector] || 0) + alloc;
        }

        const todayStats: DailyStats = {
          date: todayStr,
          totalRiskUsed: todayRecords
            .filter((r) => r.decision === 'followed')
            .reduce((sum, r) => sum + r.trade.totalRisk, 0),
          totalRiskPercent: profile.accountSize > 0
            ? (todayRecords.filter((r) => r.decision === 'followed').reduce((sum, r) => sum + r.trade.totalRisk, 0) / profile.accountSize) * 100
            : 0,
          tradesChecked: todayRecords.length,
          tradesExecuted: todayRecords.filter((r) => r.decision === 'followed').length,
          openPositionCount: activeTradesList.length,
          openPositionTickers: activeTradesList.map((r) => r.trade.ticker),
          sectorExposure,
          wins: winsToday,
          losses: lossesToday,
          totalPnlDollars: closedToday.reduce((sum, r) => sum + (r.pnlDollars ?? 0), 0),
          totalPnlR: closedToday.reduce((sum, r) => sum + (r.pnlR ?? 0), 0),
          cooldownsTriggered: 0,
          cooldownsOverridden: todayRecords.filter((r) => r.cooldownOverride).length,
          tradeLimitHit: false,
          tradeLimitOverridden: todayRecords.some((r) => r.tradeLimitOverride),
        };

        const verdict = evaluateTrade(
          currentTrade as ProposedTrade,
          rules,
          profile,
          todayStats
        );
        setCurrentVerdict(verdict);
      }
    }, 1000));

    timers.push(setTimeout(() => {
      if (currentTrade && profile) {
        router.replace('/checkpoint/verdict');
      }
    }, 1300));

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {STEPS.map((step, index) => (
          <Animated.View
            key={index}
            entering={FadeIn.delay(index * 350).duration(300)}
            style={[styles.stepRow, currentStep === index && styles.stepRowActive]}
          >
            <StepIcon type={step.icon} active={currentStep >= index} />
            <Text style={[styles.stepText, currentStep >= index && styles.stepTextActive]}>
              {step.text}
            </Text>
            {currentStep > index && (
              <Animated.View entering={FadeIn.duration(300)}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path d="M9 12l2 2 4-4" stroke={colors.verdictProceed} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </Animated.View>
            )}
          </Animated.View>
        ))}
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, animatedProgress]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  content: {
    gap: spacing.xxl,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    opacity: 0.4,
  },
  stepRowActive: {
    opacity: 1,
  },
  stepText: {
    flex: 1,
    fontSize: typography.md,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },
  stepTextActive: {
    color: colors.textPrimary,
    fontFamily: typography.semiBold,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 60,
    left: spacing.xxxl,
    right: spacing.xxxl,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});
