import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useAppStore } from '../src/stores/useAppStore';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { colors } from '../src/theme';

export default function RootLayout() {
  const isOnboardingComplete = useAppStore((s) => s.isOnboardingComplete);
  const [hydrated, setHydrated] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAppStore.persist.getOptions().skipHydration !== true) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  // Handle auth-style redirect: onboarding <-> main tabs
  useEffect(() => {
    if (!hydrated || !fontsLoaded) return;

    const inOnboarding = segments[0] === '(onboarding)';

    if (isOnboardingComplete && inOnboarding) {
      // Onboarding just completed — go to main app
      router.replace('/(tabs)');
    } else if (!isOnboardingComplete && !inOnboarding) {
      // Not onboarded yet — send to onboarding
      router.replace('/(onboarding)');
    }
  }, [isOnboardingComplete, hydrated, fontsLoaded, segments]);

  if (!fontsLoaded || !hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="checkpoint"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="daily-plan"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="end-of-day-review"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
