import { useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Svg, Path, Circle, Rect, Line } from 'react-native-svg';
import { colors, typography, spacing, radii } from '../../src/theme';
import { useDailyPlanStore } from '../../src/stores/useDailyPlanStore';
import { useEndOfDayReviewStore } from '../../src/stores/useEndOfDayReviewStore';
import { EMOTION_OPTIONS } from '../../src/types/models';

function HomeIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 22V12h6v10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function AnalyticsIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M18 20V10M12 20V4M6 20v-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PlusIcon() {
  return (
    <View style={styles.plusBtn}>
      <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
        <Path d="M12 5v14M5 12h14" stroke={colors.white} strokeWidth={2.5} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

function JournalIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 7h8M8 11h6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function SettingsIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={2} />
      <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

// ─── Action Sheet Item ─────────────────────────────────────────
function ActionItem({ icon, label, description, onPress, color }: {
  icon: React.ReactNode; label: string; description: string; onPress: () => void; color: string;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.actionItem} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={description}>
      <View style={[styles.actionItemIcon, { backgroundColor: color + '20' }]}>
        {icon}
      </View>
      <View style={styles.actionItemText}>
        <Text style={styles.actionItemLabel}>{label}</Text>
        <Text style={styles.actionItemDesc}>{description}</Text>
      </View>
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path d="M9 18l6-6-6-6" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const router = useRouter();
  const [showActions, setShowActions] = useState(false);

  // Check if today's plan exists for the action sheet description
  const todayPlan = useDailyPlanStore((s) => s.getTodayPlan)();
  const planMoodEmoji = todayPlan
    ? EMOTION_OPTIONS.find((e) => e.value === todayPlan.mood)?.emoji
    : undefined;

  // Check if today's EOD review exists
  const todayReview = useEndOfDayReviewStore((s) => s.getTodayReview)();

  const handleAction = (action: 'plan' | 'execute' | 'quick' | 'reflect' | 'review') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowActions(false);
    if (action === 'plan') {
      router.push('/daily-plan');
    } else if (action === 'execute') {
      router.push('/checkpoint/enter-trade');
    } else if (action === 'quick') {
      router.push({ pathname: '/checkpoint/enter-trade', params: { mode: 'quick' } });
    } else if (action === 'review') {
      router.push('/end-of-day-review');
    } else {
      router.push('/(tabs)/journal');
    }
  };

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <HomeIcon color={color} />,
            tabBarAccessibilityLabel: 'Home tab',
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: 'Analytics',
            tabBarIcon: ({ color }) => <AnalyticsIcon color={color} />,
            tabBarAccessibilityLabel: 'Analytics tab',
          }}
        />
        <Tabs.Screen
          name="checkpoint"
          options={{
            title: '',
            tabBarIcon: () => <PlusIcon />,
            tabBarAccessibilityLabel: 'New action menu',
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowActions(true);
            },
          }}
        />
        <Tabs.Screen
          name="journal"
          options={{
            title: 'Journal',
            tabBarIcon: ({ color }) => <JournalIcon color={color} />,
            tabBarAccessibilityLabel: 'Journal tab',
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color }) => <SettingsIcon color={color} />,
            tabBarAccessibilityLabel: 'Settings tab',
          }}
        />
        {/* Hidden tabs — file routes exist but not shown in tab bar */}
        <Tabs.Screen name="watchlist" options={{ href: null }} />
        <Tabs.Screen name="history" options={{ href: null }} />
        <Tabs.Screen name="performance" options={{ href: null }} />
        <Tabs.Screen name="calendar" options={{ href: null }} />
      </Tabs>

      {/* ─── Plan → Execute → Reflect Action Sheet ────────────── */}
      <Modal
        visible={showActions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActions(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowActions(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <Animated.View entering={SlideInDown.duration(250)} style={styles.sheet}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>What would you like to do?</Text>

                {/* Plan */}
                <ActionItem
                  icon={
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                      <Path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2V3z" stroke={colors.verdictAdjust} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      <Path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7V3z" stroke={colors.verdictAdjust} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  }
                  label="Plan My Day"
                  description={todayPlan
                    ? `${planMoodEmoji} Plan set — tap to edit`
                    : 'Set your mood, watchlist & intention'}
                  onPress={() => handleAction('plan')}
                  color={colors.verdictAdjust}
                />

                {/* Execute */}
                <ActionItem
                  icon={
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={colors.primary} strokeWidth={2} />
                      <Path d="M9 12l2 2 4-4" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  }
                  label="Check My Trade"
                  description="Validate against your rules & size your position"
                  onPress={() => handleAction('execute')}
                  color={colors.primary}
                />

                {/* Quick Add */}
                <ActionItem
                  icon={
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                      <Path d="M12 5v14M5 12h14" stroke={colors.marketUp} strokeWidth={2.5} strokeLinecap="round" />
                    </Svg>
                  }
                  label="Quick Add Trade"
                  description="Log a trade without running the pre-check"
                  onPress={() => handleAction('quick')}
                  color={colors.marketUp}
                />

                {/* Reflect */}
                <ActionItem
                  icon={
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                      <Path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke={colors.verdictProceed} strokeWidth={2} strokeLinecap="round" />
                    </Svg>
                  }
                  label="Reflect"
                  description="Journal your trades, thoughts & lessons"
                  onPress={() => handleAction('reflect')}
                  color={colors.verdictProceed}
                />

                {/* Review */}
                <ActionItem
                  icon={
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                      <Path d="M9 11l3 3L22 4" stroke={colors.verdictAdjust} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      <Path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke={colors.verdictAdjust} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  }
                  label="Review Your Day"
                  description={todayReview
                    ? `✓ Reviewed — discipline: ${todayReview.disciplineRating}/5`
                    : 'End-of-day accountability check'}
                  onPress={() => handleAction('review')}
                  color={colors.verdictAdjust}
                />
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 88,
    paddingTop: 8,
  },
  tabLabel: {
    fontFamily: typography.semiBold,
    fontSize: 10,
    marginTop: 2,
  },
  plusBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  // ─── Action Sheet ──────────────────────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.md,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceHover,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    fontSize: typography.md,
    fontFamily: typography.bold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionItemText: { flex: 1, gap: 2 },
  actionItemLabel: {
    fontSize: typography.base,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },
  actionItemDesc: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },
});
