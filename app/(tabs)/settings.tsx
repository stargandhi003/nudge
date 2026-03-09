import { View, Text, StyleSheet, ScrollView, Switch, Alert, Linking, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radii } from '../../src/theme';
import { Card, Button, Input } from '../../src/components/ui';
import { useAppStore } from '../../src/stores/useAppStore';
import { useUserStore } from '../../src/stores/useUserStore';
import { useRulesStore } from '../../src/stores/useRulesStore';
import { useHistoryStore } from '../../src/stores/useHistoryStore';
import { useTradeRecordStore } from '../../src/stores/useTradeRecordStore';
import { useWatchlistStore } from '../../src/stores/useWatchlistStore';
import { useJournalStore } from '../../src/stores/useJournalStore';
import { useDailyPlanStore } from '../../src/stores/useDailyPlanStore';
import { useEndOfDayReviewStore } from '../../src/stores/useEndOfDayReviewStore';
import { useStreakStore } from '../../src/stores/useStreakStore';
import { formatCurrency, formatPercent } from '../../src/utils/formatting';
import Slider from '@react-native-community/slider';
import { RULE_LIMITS } from '../../src/utils/constants';

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      {children}
    </View>
  );
}

function RuleRow({ label, value, suffix, onChange, min, max, step }: {
  label: string;
  value: number;
  suffix: string;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <View style={styles.ruleRow}>
      <View style={styles.ruleHeader}>
        <Text style={styles.ruleLabel}>{label}</Text>
        <Text style={styles.ruleValue}>
          {suffix === '%' ? formatPercent(value, step < 1 ? 1 : 0) : `${value}`}
        </Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.surfaceHover}
        thumbTintColor={colors.primary}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const { hapticEnabled, setHapticEnabled, hidePnl, setHidePnl, reset: resetApp } = useAppStore();
  const { profile, setProfile, updateAccountSize, reset: resetUser } = useUserStore();
  const { rules, updateRule, resetToDefaults } = useRulesStore();
  const { clearAll: clearHistory } = useHistoryStore();
  const { clearAll: clearTradeRecords, records: tradeRecords } = useTradeRecordStore();
  const { items: watchlistItems } = useWatchlistStore();
  const { entries: journalEntries, clearAll: clearJournal } = useJournalStore();
  const { plans: dailyPlans, clearAll: clearDailyPlans } = useDailyPlanStore();
  const { reviews: eodReviews, clearAll: clearEodReviews } = useEndOfDayReviewStore();
  const { clearAll: clearStreaks } = useStreakStore();

  const accountSize = profile?.accountSize ?? 0;

  const handleReset = () => {
    Alert.alert(
      'Reset Everything',
      'This will clear all your data including rules, watchlist, and decision history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetApp();
            resetUser();
            resetToDefaults();
            clearHistory();
            clearTradeRecords();
            clearJournal();
            clearDailyPlans();
            clearEodReviews();
            clearStreaks();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Account */}
        <Text style={styles.sectionTitle}>Account</Text>
        <Card>
          <SettingRow label="Name">
            <Text style={styles.settingValue}>{profile?.name || 'Not set'}</Text>
          </SettingRow>
          <View style={styles.divider} />
          <SettingRow label="Account Size">
            <Text style={styles.settingValue}>{formatCurrency(accountSize)}</Text>
          </SettingRow>
          {profile?.tradingType && (
            <>
              <View style={styles.divider} />
              <SettingRow label="Trading Type">
                <Text style={styles.settingValue}>
                  {profile.tradingType.charAt(0).toUpperCase() + profile.tradingType.slice(1)}
                </Text>
              </SettingRow>
            </>
          )}
        </Card>

        {/* Risk Rules */}
        <Text style={styles.sectionTitle}>Risk Rules</Text>
        <Card style={styles.rulesCard}>
          <RuleRow
            label="Max Risk Per Trade"
            value={rules.maxRiskPerTrade}
            suffix="%"
            onChange={(v) => updateRule('maxRiskPerTrade', Math.round(v * 10) / 10)}
            min={RULE_LIMITS.maxRiskPerTrade.min}
            max={RULE_LIMITS.maxRiskPerTrade.max}
            step={RULE_LIMITS.maxRiskPerTrade.step}
          />
          <View style={styles.divider} />
          <RuleRow
            label="Daily Loss Limit"
            value={rules.dailyLossLimit}
            suffix="%"
            onChange={(v) => updateRule('dailyLossLimit', Math.round(v * 10) / 10)}
            min={RULE_LIMITS.dailyLossLimit.min}
            max={RULE_LIMITS.dailyLossLimit.max}
            step={RULE_LIMITS.dailyLossLimit.step}
          />
          <View style={styles.divider} />
          <RuleRow
            label="Max Open Positions"
            value={rules.maxOpenPositions}
            suffix=""
            onChange={(v) => updateRule('maxOpenPositions', Math.round(v))}
            min={RULE_LIMITS.maxOpenPositions.min}
            max={RULE_LIMITS.maxOpenPositions.max}
            step={RULE_LIMITS.maxOpenPositions.step}
          />
          <View style={styles.divider} />
          <RuleRow
            label="Max Sector Exposure"
            value={rules.maxSectorExposure}
            suffix="%"
            onChange={(v) => updateRule('maxSectorExposure', Math.round(v))}
            min={RULE_LIMITS.maxSectorExposure.min}
            max={RULE_LIMITS.maxSectorExposure.max}
            step={RULE_LIMITS.maxSectorExposure.step}
          />
          <View style={styles.divider} />
          <RuleRow
            label="Max Single Stock"
            value={rules.maxSingleStockAllocation}
            suffix="%"
            onChange={(v) => updateRule('maxSingleStockAllocation', Math.round(v))}
            min={RULE_LIMITS.maxSingleStockAllocation.min}
            max={RULE_LIMITS.maxSingleStockAllocation.max}
            step={RULE_LIMITS.maxSingleStockAllocation.step}
          />
        </Card>

        {/* Behavioral Rules */}
        <Text style={styles.sectionTitle}>Behavioral Rules</Text>
        <Card style={styles.rulesCard}>
          <RuleRow
            label="Daily Trade Limit"
            value={rules.dailyTradeLimit}
            suffix=""
            onChange={(v) => updateRule('dailyTradeLimit', Math.round(v))}
            min={RULE_LIMITS.dailyTradeLimit.min}
            max={RULE_LIMITS.dailyTradeLimit.max}
            step={RULE_LIMITS.dailyTradeLimit.step}
          />
        </Card>

        <Button title="Reset Rules to Defaults" variant="secondary" onPress={resetToDefaults} />

        {/* Preferences */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <Card>
          <SettingRow label="Hide P&L">
            <Switch
              value={hidePnl}
              onValueChange={setHidePnl}
              trackColor={{ false: colors.surfaceHover, true: colors.primary + '60' }}
              thumbColor={hidePnl ? colors.primary : colors.textMuted}
            />
          </SettingRow>
          <View style={styles.divider} />
          <SettingRow label="Haptic Feedback">
            <Switch
              value={hapticEnabled}
              onValueChange={setHapticEnabled}
              trackColor={{ false: colors.surfaceHover, true: colors.primary + '60' }}
              thumbColor={hapticEnabled ? colors.primary : colors.textMuted}
            />
          </SettingRow>
        </Card>

        {/* Danger Zone */}
        <Text style={styles.sectionTitle}>Data</Text>
        <Card>
          <SettingRow label="Trade Records">
            <Text style={styles.settingValue}>{tradeRecords.length}</Text>
          </SettingRow>
          <View style={styles.divider} />
          <SettingRow label="Watchlist Items">
            <Text style={styles.settingValue}>{watchlistItems.length}</Text>
          </SettingRow>
          <View style={styles.divider} />
          <SettingRow label="Journal Entries">
            <Text style={styles.settingValue}>{journalEntries.length}</Text>
          </SettingRow>
          <View style={styles.divider} />
          <SettingRow label="Daily Plans">
            <Text style={styles.settingValue}>{dailyPlans.length}</Text>
          </SettingRow>
          <View style={styles.divider} />
          <SettingRow label="EOD Reviews">
            <Text style={styles.settingValue}>{eodReviews.length}</Text>
          </SettingRow>
        </Card>

        <Button title="Reset Everything" variant="danger" onPress={handleReset} />

        {/* About & Legal */}
        <Text style={styles.sectionTitle}>About</Text>
        <Card>
          <TouchableOpacity
            onPress={() => Linking.openURL('https://nudgeapp.co/privacy')}
            activeOpacity={0.7}
          >
            <SettingRow label="Privacy Policy">
              <Text style={styles.linkText}>View →</Text>
            </SettingRow>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            onPress={() => Linking.openURL('https://nudgeapp.co/terms')}
            activeOpacity={0.7}
          >
            <SettingRow label="Terms of Service">
              <Text style={styles.linkText}>View →</Text>
            </SettingRow>
          </TouchableOpacity>
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Nudge v1.0.0</Text>
          <Text style={styles.disclaimerText}>
            Nudge is a personal accountability tool. It does not provide investment advice, execute trades, or connect to any brokerage. All data is stored locally on your device.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: typography.xl,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  scrollContent: {
    padding: spacing.xl,
    gap: spacing.md,
    paddingBottom: 120,
  },
  sectionTitle: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.lg,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  settingLabel: {
    fontSize: typography.base,
    fontFamily: typography.regular,
    color: colors.textPrimary,
  },
  settingValue: {
    fontSize: typography.base,
    fontFamily: typography.semiBold,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  rulesCard: { gap: spacing.sm },
  ruleRow: { paddingVertical: spacing.xs },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ruleLabel: {
    fontSize: typography.base,
    fontFamily: typography.regular,
    color: colors.textPrimary,
  },
  ruleValue: {
    fontSize: typography.base,
    fontFamily: typography.bold,
    color: colors.primary,
  },
  slider: { width: '100%', height: 36 },
  footer: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  footerText: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },
  disclaimerText: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.lg,
  },
  linkText: {
    fontSize: typography.base,
    fontFamily: typography.semiBold,
    color: colors.primary,
  },
});
