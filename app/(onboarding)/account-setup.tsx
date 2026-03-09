import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { generateId } from '../../src/utils/uuid';
import { colors, typography, spacing, radii } from '../../src/theme';
import { Button, Input } from '../../src/components/ui';
import { useUserStore } from '../../src/stores/useUserStore';
import { TradingType } from '../../src/types/models';
import { ACCOUNT_SIZE_PRESETS } from '../../src/utils/constants';
import { formatCurrency } from '../../src/utils/formatting';

export default function AccountSetupScreen() {
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name?: string }>();
  const setProfile = useUserStore((s) => s.setProfile);

  const [accountSize, setAccountSize] = useState('');
  const [tradingType, setTradingType] = useState<TradingType>('stocks');

  const handlePreset = (value: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAccountSize(value.toString());
  };

  const handleContinue = () => {
    const size = parseFloat(accountSize);
    if (!size || size <= 0) return;

    setProfile({
      id: generateId(),
      name: name ?? '',
      accountSize: size,
      tradingType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    router.push('/(onboarding)/risk-rules');
  };

  const isValid = parseFloat(accountSize) > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: '50%' }]} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={styles.stepLabel}>Step 2 of 4</Text>
          <Text style={styles.title}>Your Trading Account</Text>
          <Text style={styles.description}>
            This helps Nudge calculate the right position sizes for you.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.section}>
          <Input
            label="Account Size"
            value={accountSize}
            onChangeText={setAccountSize}
            placeholder="50,000"
            keyboardType="numeric"
            prefix="$"
            large
          />

          <View style={styles.presets}>
            {ACCOUNT_SIZE_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset}
                onPress={() => handlePreset(preset)}
                style={[
                  styles.presetChip,
                  parseFloat(accountSize) === preset && styles.presetChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.presetText,
                    parseFloat(accountSize) === preset && styles.presetTextActive,
                  ]}
                >
                  {formatCurrency(preset)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(600).duration(500)} style={styles.section}>
          <Text style={styles.sectionLabel}>What do you trade?</Text>
          <View style={styles.typeRow}>
            {(['stocks', 'options', 'both'] as TradingType[]).map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTradingType(type);
                }}
                style={[styles.typeChip, tradingType === type && styles.typeChipActive]}
              >
                <Text style={[styles.typeText, tradingType === type && styles.typeTextActive]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      <View style={styles.bottom}>
        <Button title="Continue" onPress={handleContinue} disabled={!isValid} />
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
  scrollContent: { padding: spacing.xl, gap: spacing.xxl },
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
  section: { gap: spacing.lg },
  sectionLabel: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  presetChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  presetText: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textSecondary,
  },
  presetTextActive: {
    color: colors.primary,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeChip: {
    flex: 1,
    paddingVertical: spacing.md + 2,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  typeChipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  typeText: {
    fontSize: typography.base,
    fontFamily: typography.semiBold,
    color: colors.textSecondary,
  },
  typeTextActive: {
    color: colors.primary,
  },
  bottom: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
});
