import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radii } from '../../src/theme';
import { Card, VerdictBadge, StatusBadge } from '../../src/components/ui';
import { useHistoryStore } from '../../src/stores/useHistoryStore';
import { VerdictLevel, DecisionLogEntry } from '../../src/types/models';
import { formatCurrency, formatPercent } from '../../src/utils/formatting';
import { format } from 'date-fns';

type FilterType = 'all' | VerdictLevel;

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.filterChip, active && styles.filterChipActive]}
    >
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function HistoryItem({ entry }: { entry: DecisionLogEntry }) {
  const outcomeColor = entry.outcome === 'followed' ? colors.verdictProceed
    : entry.outcome === 'overrode' ? colors.verdictStop : colors.textMuted;
  const outcomeLabel = entry.outcome === 'followed' ? 'Followed'
    : entry.outcome === 'overrode' ? 'Overrode' : 'Pending';

  return (
    <Card style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View>
          <Text style={styles.historyTicker}>
            {entry.trade.direction.toUpperCase()} {entry.trade.ticker}
          </Text>
          <Text style={styles.historyTime}>
            {format(new Date(entry.createdAt), 'MMM d, yyyy · h:mm a')}
          </Text>
        </View>
        <VerdictBadge level={entry.verdict.level} size="sm" />
      </View>

      <View style={styles.historyDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Risk</Text>
          <Text style={styles.detailValue}>
            {formatPercent(entry.verdict.positionSizing.riskPercent)}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Size</Text>
          <Text style={styles.detailValue}>
            {entry.verdict.positionSizing.recommendedShares} shares
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Score</Text>
          <Text style={styles.detailValue}>{entry.verdict.overallRiskScore}/100</Text>
        </View>
      </View>

      <View style={styles.historyFooter}>
        <StatusBadge label={outcomeLabel} color={outcomeColor} />
        {entry.actualPnL !== undefined && (
          <Text style={[styles.pnl, { color: entry.actualPnL >= 0 ? colors.marketUp : colors.marketDown }]}>
            {entry.actualPnL >= 0 ? '+' : ''}{formatCurrency(entry.actualPnL)}
          </Text>
        )}
      </View>
    </Card>
  );
}

export default function HistoryScreen() {
  const { entries, getFollowRate } = useHistoryStore();
  const [filter, setFilter] = useState<FilterType>('all');

  const followRate = getFollowRate();
  const filteredEntries = filter === 'all'
    ? entries
    : entries.filter((e) => e.verdict.level === filter);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Decision Log</Text>
      </View>

      {entries.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.miniStat}>
            <Text style={styles.miniStatValue}>{entries.length}</Text>
            <Text style={styles.miniStatLabel}>Checks</Text>
          </View>
          <View style={styles.miniStat}>
            <Text style={[styles.miniStatValue, { color: colors.verdictProceed }]}>{followRate}%</Text>
            <Text style={styles.miniStatLabel}>Follow Rate</Text>
          </View>
        </View>
      )}

      <View style={styles.filters}>
        <FilterChip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
        <FilterChip label="Proceed" active={filter === 'proceed'} onPress={() => setFilter('proceed')} />
        <FilterChip label="Adjust" active={filter === 'adjust'} onPress={() => setFilter('adjust')} />
        <FilterChip label="Wait" active={filter === 'wait'} onPress={() => setFilter('wait')} />
        <FilterChip label="Stop" active={filter === 'stop'} onPress={() => setFilter('stop')} />
      </View>

      <FlatList
        data={filteredEntries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <HistoryItem entry={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {filter === 'all' ? 'No checks yet' : `No ${filter} verdicts`}
            </Text>
            <Text style={styles.emptyDesc}>
              Run a pre-trade checkpoint to start building your decision log.
            </Text>
          </View>
        }
      />
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
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  miniStatValue: {
    fontSize: typography.lg,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  miniStatLabel: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filterChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textMuted,
  },
  filterTextActive: {
    color: colors.primary,
  },
  listContent: { paddingHorizontal: spacing.xl, gap: spacing.sm, paddingBottom: 120 },
  historyCard: { gap: spacing.md },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  historyTicker: {
    fontSize: typography.base,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },
  historyTime: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  historyDetails: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  detailItem: { gap: spacing.xs },
  detailLabel: {
    fontSize: typography.xs,
    fontFamily: typography.semiBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pnl: {
    fontSize: typography.base,
    fontFamily: typography.bold,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.md,
    fontFamily: typography.semiBold,
    color: colors.textSecondary,
  },
  emptyDesc: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
