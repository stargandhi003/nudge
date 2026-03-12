import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert, Linking, TouchableOpacity, TextInput } from 'react-native';
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
import { usePasswordVaultStore, BrokerEntry } from '../../src/stores/usePasswordVaultStore';
import { generateId } from '../../src/utils/uuid';
import { formatCurrency, formatPercent } from '../../src/utils/formatting';
import Slider from '@react-native-community/slider';
import { RULE_LIMITS } from '../../src/utils/constants';
import { Svg, Path } from 'react-native-svg';

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

function NullableRuleRow({ label, value, suffix, onChange, onToggleNA, min, max, step, defaultVal }: {
  label: string;
  value: number | null;
  suffix: string;
  onChange: (v: number) => void;
  onToggleNA: () => void;
  min: number;
  max: number;
  step: number;
  defaultVal: number;
}) {
  return (
    <View style={styles.ruleRow}>
      <View style={styles.ruleHeader}>
        <Text style={styles.ruleLabel}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {value !== null && (
            <Text style={styles.ruleValue}>
              {suffix === '%' ? formatPercent(value, step < 1 ? 1 : 0) : `${value}`}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.naChip, value === null && styles.naChipActive]}
            onPress={onToggleNA}
            activeOpacity={0.7}
          >
            <Text style={[styles.naChipText, value === null && styles.naChipTextActive]}>N/A</Text>
          </TouchableOpacity>
        </View>
      </View>
      {value !== null ? (
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
      ) : (
        <Text style={styles.naDisabledText}>Rule disabled</Text>
      )}
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
  const { vaultEnabled, setVaultEnabled, entries: vaultEntries, addEntry, updateEntry, removeEntry, clearAll: clearVault } = usePasswordVaultStore();

  // Vault editing state
  const [editingBrokerId, setEditingBrokerId] = useState<string | null>(null);
  const [brokerName, setBrokerName] = useState('');
  const [brokerUsername, setBrokerUsername] = useState('');
  const [brokerPassword, setBrokerPassword] = useState('');
  const [showAddBroker, setShowAddBroker] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const accountSize = profile?.accountSize ?? 0;

  const togglePasswordVisible = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveBroker = () => {
    if (!brokerName.trim()) return;
    const now = new Date().toISOString();
    if (editingBrokerId) {
      updateEntry(editingBrokerId, {
        brokerName: brokerName.trim(),
        username: brokerUsername.trim(),
        password: brokerPassword,
      });
    } else {
      addEntry({
        id: generateId(),
        brokerName: brokerName.trim(),
        username: brokerUsername.trim(),
        password: brokerPassword,
        createdAt: now,
        updatedAt: now,
      });
    }
    setBrokerName('');
    setBrokerUsername('');
    setBrokerPassword('');
    setEditingBrokerId(null);
    setShowAddBroker(false);
  };

  const handleEditBroker = (entry: BrokerEntry) => {
    setBrokerName(entry.brokerName);
    setBrokerUsername(entry.username);
    setBrokerPassword(entry.password);
    setEditingBrokerId(entry.id);
    setShowAddBroker(true);
  };

  const handleDeleteBroker = (id: string, name: string) => {
    Alert.alert('Delete Broker', `Remove "${name}" and its password?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeEntry(id) },
    ]);
  };

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
            clearVault();
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
          <NullableRuleRow
            label="Max Sector Exposure"
            value={rules.maxSectorExposure}
            suffix="%"
            onChange={(v) => updateRule('maxSectorExposure', Math.round(v))}
            onToggleNA={() => updateRule('maxSectorExposure', rules.maxSectorExposure === null ? RULE_LIMITS.maxSectorExposure.default : null)}
            min={RULE_LIMITS.maxSectorExposure.min}
            max={RULE_LIMITS.maxSectorExposure.max}
            step={RULE_LIMITS.maxSectorExposure.step}
            defaultVal={RULE_LIMITS.maxSectorExposure.default}
          />
          <View style={styles.divider} />
          <NullableRuleRow
            label="Max Single Stock"
            value={rules.maxSingleStockAllocation}
            suffix="%"
            onChange={(v) => updateRule('maxSingleStockAllocation', Math.round(v))}
            onToggleNA={() => updateRule('maxSingleStockAllocation', rules.maxSingleStockAllocation === null ? RULE_LIMITS.maxSingleStockAllocation.default : null)}
            min={RULE_LIMITS.maxSingleStockAllocation.min}
            max={RULE_LIMITS.maxSingleStockAllocation.max}
            step={RULE_LIMITS.maxSingleStockAllocation.step}
            defaultVal={RULE_LIMITS.maxSingleStockAllocation.default}
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

        {/* Password Vault */}
        <Text style={styles.sectionTitle}>Broker Password Vault</Text>
        <Card>
          <SettingRow label="Enable Password Vault">
            <Switch
              value={vaultEnabled}
              onValueChange={setVaultEnabled}
              trackColor={{ false: colors.surfaceHover, true: colors.primary + '60' }}
              thumbColor={vaultEnabled ? colors.primary : colors.textMuted}
            />
          </SettingRow>
          {vaultEnabled && (
            <>
              <View style={styles.divider} />
              <Text style={styles.vaultDescription}>
                Store your broker passwords here. They'll only be visible on the dashboard after you set your daily plan.
              </Text>

              {/* Existing broker entries */}
              {vaultEntries.map((entry) => (
                <View key={entry.id} style={styles.vaultEntry}>
                  <View style={styles.vaultEntryHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.vaultBrokerName}>{entry.brokerName}</Text>
                      {entry.username ? <Text style={styles.vaultUsername}>{entry.username}</Text> : null}
                    </View>
                    <View style={styles.vaultActions}>
                      <TouchableOpacity onPress={() => togglePasswordVisible(entry.id)} activeOpacity={0.7} style={styles.vaultIconBtn}>
                        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                          {visiblePasswords[entry.id] ? (
                            <Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                          ) : (
                            <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zM12 9a3 3 0 100 6 3 3 0 000-6z" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                          )}
                        </Svg>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleEditBroker(entry)} activeOpacity={0.7} style={styles.vaultIconBtn}>
                        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                          <Path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" />
                        </Svg>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteBroker(entry.id, entry.brokerName)} activeOpacity={0.7} style={styles.vaultIconBtn}>
                        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                          <Path d="M18 6L6 18M6 6l12 12" stroke={colors.verdictStop} strokeWidth={2} strokeLinecap="round" />
                        </Svg>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.vaultPasswordText}>
                    {visiblePasswords[entry.id] ? entry.password : '••••••••'}
                  </Text>
                </View>
              ))}

              {/* Add/Edit broker form */}
              {showAddBroker ? (
                <View style={styles.vaultForm}>
                  <TextInput
                    style={styles.vaultInput}
                    placeholder="Broker name (e.g. Robinhood)"
                    placeholderTextColor={colors.textMuted}
                    value={brokerName}
                    onChangeText={setBrokerName}
                    selectionColor={colors.primary}
                  />
                  <TextInput
                    style={styles.vaultInput}
                    placeholder="Username / Email (optional)"
                    placeholderTextColor={colors.textMuted}
                    value={brokerUsername}
                    onChangeText={setBrokerUsername}
                    autoCapitalize="none"
                    selectionColor={colors.primary}
                  />
                  <TextInput
                    style={styles.vaultInput}
                    placeholder="Password"
                    placeholderTextColor={colors.textMuted}
                    value={brokerPassword}
                    onChangeText={setBrokerPassword}
                    secureTextEntry
                    selectionColor={colors.primary}
                  />
                  <View style={styles.vaultFormActions}>
                    <TouchableOpacity
                      style={styles.vaultCancelBtn}
                      onPress={() => {
                        setShowAddBroker(false);
                        setEditingBrokerId(null);
                        setBrokerName('');
                        setBrokerUsername('');
                        setBrokerPassword('');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.vaultCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.vaultSaveBtn, !brokerName.trim() && { opacity: 0.4 }]}
                      onPress={handleSaveBroker}
                      disabled={!brokerName.trim()}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.vaultSaveText}>{editingBrokerId ? 'Update' : 'Save'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.vaultAddBtn} onPress={() => setShowAddBroker(true)} activeOpacity={0.7}>
                  <Text style={styles.vaultAddText}>+ Add Broker</Text>
                </TouchableOpacity>
              )}
            </>
          )}
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
  naChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  naChipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  naChipText: {
    fontSize: typography.xs,
    fontFamily: typography.bold,
    color: colors.textMuted,
  },
  naChipTextActive: {
    color: colors.primary,
  },
  naDisabledText: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  // ── Vault
  vaultDescription: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
    lineHeight: 18,
    paddingVertical: spacing.sm,
  },
  vaultEntry: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  vaultEntryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  vaultBrokerName: {
    fontSize: typography.base,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },
  vaultUsername: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },
  vaultPasswordText: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  vaultActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  vaultIconBtn: {
    padding: spacing.xs,
  },
  vaultForm: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  vaultInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontFamily: typography.regular,
    fontSize: typography.base,
    color: colors.textPrimary,
  },
  vaultFormActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  vaultCancelBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
  },
  vaultCancelText: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textMuted,
  },
  vaultSaveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
  },
  vaultSaveText: {
    fontSize: typography.sm,
    fontFamily: typography.bold,
    color: colors.white,
  },
  vaultAddBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  vaultAddText: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.primary,
  },
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
