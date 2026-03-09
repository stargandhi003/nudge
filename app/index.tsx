import { Redirect } from 'expo-router';
import { useAppStore } from '../src/stores/useAppStore';

export default function Index() {
  const isOnboardingComplete = useAppStore((s) => s.isOnboardingComplete);

  if (isOnboardingComplete) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(onboarding)" />;
}
