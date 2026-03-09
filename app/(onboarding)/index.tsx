import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing } from '../../src/theme';
import { Button } from '../../src/components/ui';
import { Svg, Path, Circle } from 'react-native-svg';

function ShieldIcon() {
  return (
    <View style={styles.iconContainer}>
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={colors.verdictProceed} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M9 12l2 2 4-4" stroke={colors.verdictProceed} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

function CalculatorIcon() {
  return (
    <View style={styles.iconContainer}>
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path d="M4 4h16v16H4z" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" rx={2} />
        <Path d="M8 8h8M8 12h2M14 12h2M8 16h2M14 16h2" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

function BrainIcon() {
  return (
    <View style={styles.iconContainer}>
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={9} stroke={colors.verdictAdjust} strokeWidth={2} />
        <Path d="M12 8v4l2 2" stroke={colors.verdictAdjust} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <LinearGradient colors={['#0F1524', colors.background]} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <View style={styles.topSection}>
          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <Text style={styles.logo}>N</Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(400).duration(600)}>
            <Text style={styles.title}>Nudge</Text>
            <Text style={styles.subtitle}>Trade smarter. Risk less.</Text>
          </Animated.View>
        </View>

        <View style={styles.features}>
          <Animated.View entering={FadeInDown.delay(600).duration(600)} style={styles.featureRow}>
            <ShieldIcon />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Set Your Rules</Text>
              <Text style={styles.featureDesc}>Define your risk limits and trading boundaries</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(800).duration(600)} style={styles.featureRow}>
            <CalculatorIcon />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Size Every Position</Text>
              <Text style={styles.featureDesc}>Get exact share counts based on your risk rules</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(1000).duration(600)} style={styles.featureRow}>
            <BrainIcon />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Build Discipline</Text>
              <Text style={styles.featureDesc}>Track decisions and spot behavioral patterns</Text>
            </View>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(1200).duration(600)} style={styles.bottomSection}>
          <Button title="Get Started" onPress={() => router.push('/(onboarding)/your-name')} />
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.xl },
  topSection: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg },
  logo: {
    fontSize: 72,
    fontFamily: typography.bold,
    color: colors.primary,
    textAlign: 'center',
  },
  title: {
    fontSize: typography.display,
    fontFamily: typography.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.lg,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  features: { gap: spacing.xl, paddingBottom: spacing.xxl },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: { flex: 1, gap: spacing.xs },
  featureTitle: {
    fontSize: typography.base,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },
  featureDesc: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  bottomSection: { paddingBottom: spacing.xxl },
});
