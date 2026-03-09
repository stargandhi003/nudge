import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, radii } from '../../src/theme';
import { Button } from '../../src/components/ui';

function WaveIcon() {
  return (
    <Text style={styles.waveEmoji}>👋</Text>
  );
}

export default function YourNameScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Auto-focus the input after animation
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/(onboarding)/account-setup', params: { name: trimmed } });
  };

  const isValid = name.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: '25%' }]} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <WaveIcon />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(500)}>
            <Text style={styles.stepLabel}>Step 1 of 4</Text>
            <Text style={styles.title}>Let's set you up</Text>
            <Text style={styles.description}>
              What should we call you? This is how Nudge will greet you.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(600).duration(500)} style={styles.inputSection}>
            <TextInput
              ref={inputRef}
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Your first name"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              maxLength={30}
              onSubmitEditing={handleContinue}
            />
          </Animated.View>
        </View>

        <View style={styles.bottom}>
          <Button title="Continue" onPress={handleContinue} disabled={!isValid} />
        </View>
      </KeyboardAvoidingView>
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
  keyboardView: { flex: 1 },
  content: {
    flex: 1,
    padding: spacing.xl,
    gap: spacing.xl,
    justifyContent: 'center',
  },
  waveEmoji: {
    fontSize: 48,
  },
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
  inputSection: {
    marginTop: spacing.sm,
  },
  nameInput: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    fontSize: typography.xl,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },
  bottom: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
});
