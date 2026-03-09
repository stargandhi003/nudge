import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { generateId } from '../../src/utils/uuid';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, radii } from '../../src/theme';
import { getVerdictColors } from '../../src/theme/colors';
import { Button } from '../../src/components/ui';
import { useTradeStore, CheckedTrade } from '../../src/stores/useTradeStore';
import { useTradeRecordStore } from '../../src/stores/useTradeRecordStore';
import { useWatchlistStore } from '../../src/stores/useWatchlistStore';
import { useUserStore } from '../../src/stores/useUserStore';
import { useRulesStore } from '../../src/stores/useRulesStore';
import { TradeDirection, ProposedTrade, TradeRecord } from '../../src/types/models';
import { formatCurrency, formatPercent } from '../../src/utils/formatting';
import { Svg, Path } from 'react-native-svg';

const POPULAR_TICKERS = [
  { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
  { ticker: 'MSFT', name: 'Microsoft', sector: 'Technology' },
  { ticker: 'GOOGL', name: 'Alphabet', sector: 'Technology' },
  { ticker: 'AMZN', name: 'Amazon', sector: 'Consumer Cyclical' },
  { ticker: 'NVDA', name: 'NVIDIA', sector: 'Technology' },
  { ticker: 'TSLA', name: 'Tesla', sector: 'Consumer Cyclical' },
  { ticker: 'META', name: 'Meta', sector: 'Technology' },
  { ticker: 'SPY', name: 'S&P 500 ETF', sector: 'ETF' },
];

export default function EnterTradeScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isQuickMode = mode === 'quick';
  const setCurrentTrade = useTradeStore((s) => s.setCurrentTrade);
  const checkedTrades = useTradeStore((s) => s.checkedTrades);
  const removeCheckedTrade = useTradeStore((s) => s.removeCheckedTrade);
  const clearCheckedTrades = useTradeStore((s) => s.clearCheckedTrades);
  const addRecord = useTradeRecordStore((s) => s.addRecord);
  const watchlistItems = useWatchlistStore((s) => s.items);
  const accountSize = useUserStore((s) => s.profile?.accountSize ?? 0);
  const maxRiskPerTrade = useRulesStore((s) => s.rules.maxRiskPerTrade);
  const maxSingleStockAllocation = useRulesStore((s) => s.rules.maxSingleStockAllocation);

  const [ticker, setTicker] = useState('');
  const [tickerName, setTickerName] = useState('');
  const [tickerSector, setTickerSector] = useState('');
  const [direction, setDirection] = useState<TradeDirection>('buy');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [quantity, setQuantity] = useState('');
  const [showTickerSearch, setShowTickerSearch] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const allTickers = useMemo(() => {
    const watchlist = watchlistItems.map((w) => ({
      ticker: w.ticker,
      name: w.name,
      sector: w.sector || '',
    }));
    const popular = POPULAR_TICKERS.filter(
      (p) => !watchlist.some((w) => w.ticker === p.ticker)
    );
    return [...watchlist, ...popular];
  }, [watchlistItems]);

  const filteredTickers = searchQuery
    ? allTickers.filter(
        (t) =>
          t.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allTickers;

  const selectTicker = (t: { ticker: string; name: string; sector: string }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTicker(t.ticker);
    setTickerName(t.name);
    setTickerSector(t.sector);
    setShowTickerSearch(false);
  };

  // Parse inputs
  const entry = parseFloat(entryPrice);
  const stop = parseFloat(stopLoss);
  const tp = parseFloat(takeProfit);

  // Auto-calculate ideal position size from stop loss + risk rules
  const riskPerShare = entry && stop && stop !== entry ? Math.abs(entry - stop) : 0;
  const maxRiskDollars = accountSize * (maxRiskPerTrade / 100);
  const maxAllocationDollars = accountSize * (maxSingleStockAllocation / 100);

  let idealShares = riskPerShare > 0 ? Math.floor(maxRiskDollars / riskPerShare) : 0;

  if (idealShares > 0 && entry > 0) {
    const maxSharesByAllocation = Math.floor(maxAllocationDollars / entry);
    if (idealShares > maxSharesByAllocation) {
      idealShares = maxSharesByAllocation;
    }
  }

  const totalRisk = riskPerShare * idealShares;
  const riskPercent = accountSize > 0 ? (totalRisk / accountSize) * 100 : 0;
  const totalCost = entry * idealShares;
  const rewardPerShare = tp && entry ? Math.abs(tp - entry) : 0;
  const rrRatio = riskPerShare > 0 && rewardPerShare > 0 ? rewardPerShare / riskPerShare : 0;

  const hasPositionSize = idealShares > 0 && riskPerShare > 0;
  const isValid = ticker && entry > 0 && stop > 0 && stop !== entry && idealShares > 0;

  // Quick mode: user provides quantity manually, stop is optional
  const quickQty = parseInt(quantity) || 0;
  const quickRiskPerShare = entry && stop && stop !== entry ? Math.abs(entry - stop) : 0;
  const quickTotalRisk = quickRiskPerShare * quickQty;
  const quickRiskPercent = accountSize > 0 ? (quickTotalRisk / accountSize) * 100 : 0;
  const isQuickValid = ticker && entry > 0 && quickQty > 0;

  const handleRunCheckpoint = () => {
    if (!isValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const trade: Partial<ProposedTrade> = {
      id: generateId(),
      ticker,
      assetType: 'stock',
      direction,
      orderType: 'market',
      quantity: idealShares,
      entryPrice: entry,
      stopLossPrice: stop,
      takeProfitPrice: tp || undefined,
      totalCost,
      riskPerShare,
      totalRisk,
      riskPercent,
      sector: tickerSector || undefined,
      createdAt: new Date().toISOString(),
    };

    setCurrentTrade(trade);
    router.push('/checkpoint/analysis');
  };

  const handleTakeTrade = (ct: CheckedTrade) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const record: TradeRecord = {
      id: generateId(),
      trade: ct.trade,
      verdict: ct.verdict,
      decision: 'followed',
      isPlanned: true,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addRecord(record);
    removeCheckedTrade(ct.trade.id);
  };

  const handleDismissChecked = (tradeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removeCheckedTrade(tradeId);
  };

  const handleQuickAdd = () => {
    if (!isQuickValid) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const now = new Date().toISOString();
    const tradeId = generateId();
    const trade: ProposedTrade = {
      id: tradeId,
      ticker,
      assetType: 'stock',
      direction,
      orderType: 'market',
      quantity: quickQty,
      entryPrice: entry,
      stopLossPrice: stop || 0,
      takeProfitPrice: tp || undefined,
      totalCost: entry * quickQty,
      riskPerShare: quickRiskPerShare,
      totalRisk: quickTotalRisk,
      riskPercent: quickRiskPercent,
      sector: tickerSector || undefined,
      createdAt: now,
    };

    const record: TradeRecord = {
      id: generateId(),
      trade,
      verdict: {
        id: generateId(),
        tradeId,
        level: 'proceed',
        overallRiskScore: 0,
        message: 'Quick-added without pre-check',
        ruleEvaluations: [],
        positionSizing: {
          recommendedShares: quickQty,
          recommendedDollarAmount: entry * quickQty,
          riskAmount: quickTotalRisk,
          riskPercent: quickRiskPercent,
          riskRewardRatio: 0,
          adjustedForExposure: false,
        },
        createdAt: now,
      },
      decision: 'followed',
      isPlanned: false,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    addRecord(record);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M18 6L6 18M6 6l12 12" stroke={colors.textSecondary} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isQuickMode ? 'Quick Add Trade' : 'Check My Trade'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── Checked Trades (session list) ─── */}
        {checkedTrades.length > 0 && (
          <View style={styles.checkedSection}>
            <View style={styles.checkedHeader}>
              <Text style={styles.label}>Checked Trades</Text>
              <TouchableOpacity onPress={clearCheckedTrades} activeOpacity={0.7}>
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            </View>
            {checkedTrades.map((ct) => {
              const vc = getVerdictColors(ct.verdict.level);
              const ps = ct.verdict.positionSizing;
              return (
                <View key={ct.trade.id} style={[styles.checkedCard, { borderLeftColor: vc.main }]}>
                  <View style={styles.checkedCardTop}>
                    <View style={styles.checkedInfo}>
                      <Text style={styles.checkedTicker}>
                        {ct.trade.direction.toUpperCase()} {ct.trade.ticker}
                      </Text>
                      <Text style={[styles.checkedVerdict, { color: vc.main }]}>
                        {vc.label} · {ps.recommendedShares} shares · {formatCurrency(ps.riskAmount)} risk
                      </Text>
                    </View>
                    <View style={styles.checkedActions}>
                      {(ct.verdict.level === 'proceed' || ct.verdict.level === 'adjust') && (
                        <TouchableOpacity
                          style={styles.takeBtn}
                          onPress={() => handleTakeTrade(ct)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.takeBtnText}>Take</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => handleDismissChecked(ct.trade.id)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                          <Path d="M18 6L6 18M6 6l12 12" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" />
                        </Svg>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Step 1: Ticker ─── */}
        {showTickerSearch ? (
          <View style={styles.section}>
            <Text style={styles.label}>Ticker</Text>
            <View style={styles.searchBar}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" />
              </Svg>
              <TextInput
                style={styles.searchInput}
                placeholder="Search ticker or company..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                selectionColor={colors.primary}
              />
            </View>
            <View style={styles.tickerGrid}>
              {filteredTickers.slice(0, 8).map((t) => (
                <TouchableOpacity
                  key={t.ticker}
                  style={styles.tickerChip}
                  onPress={() => selectTicker(t)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tickerSymbol}>{t.ticker}</Text>
                  <Text style={styles.tickerName} numberOfLines={1}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <>
            {/* ── Selected ticker + direction row ─── */}
            <View style={styles.tickerDirectionRow}>
              <TouchableOpacity style={styles.selectedTickerPill} onPress={() => setShowTickerSearch(true)} activeOpacity={0.7}>
                <Text style={styles.selectedSymbol}>{ticker}</Text>
                <Text style={styles.selectedName}>{tickerName}</Text>
                <Text style={styles.changeLink}>✎</Text>
              </TouchableOpacity>

              <View style={styles.directionToggle}>
                <TouchableOpacity
                  style={[styles.dirBtn, direction === 'buy' && styles.dirBtnBuy]}
                  onPress={() => { setDirection('buy'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dirText, direction === 'buy' && styles.dirTextActive]}>BUY</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dirBtn, direction === 'sell' && styles.dirBtnSell]}
                  onPress={() => { setDirection('sell'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dirText, direction === 'sell' && styles.dirTextActive]}>SELL</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Step 2: Prices ─── */}
            <View style={styles.section}>
              <Text style={styles.label}>Prices</Text>
              <View style={styles.priceRow}>
                <View style={styles.priceField}>
                  <Text style={styles.priceFieldLabel}>Entry</Text>
                  <View style={styles.priceInput}>
                    <Text style={styles.prefix}>$</Text>
                    <TextInput
                      style={styles.priceText}
                      value={entryPrice}
                      onChangeText={setEntryPrice}
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                      selectionColor={colors.primary}
                    />
                  </View>
                </View>
                {isQuickMode ? (
                  <View style={styles.priceField}>
                    <Text style={styles.priceFieldLabel}>Quantity</Text>
                    <View style={styles.priceInput}>
                      <TextInput
                        style={styles.priceText}
                        value={quantity}
                        onChangeText={setQuantity}
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="number-pad"
                        selectionColor={colors.primary}
                      />
                    </View>
                  </View>
                ) : (
                  <View style={styles.priceField}>
                    <Text style={styles.priceFieldLabel}>Stop Loss</Text>
                    <View style={styles.priceInput}>
                      <Text style={styles.prefix}>$</Text>
                      <TextInput
                        style={styles.priceText}
                        value={stopLoss}
                        onChangeText={setStopLoss}
                        placeholder="0.00"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                        selectionColor={colors.primary}
                      />
                    </View>
                  </View>
                )}
              </View>
              {isQuickMode ? (
                <View style={styles.priceRow}>
                  <View style={styles.priceField}>
                    <Text style={styles.priceFieldLabel}>Stop Loss (optional)</Text>
                    <View style={styles.priceInput}>
                      <Text style={styles.prefix}>$</Text>
                      <TextInput
                        style={styles.priceText}
                        value={stopLoss}
                        onChangeText={setStopLoss}
                        placeholder="0.00"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                        selectionColor={colors.primary}
                      />
                    </View>
                  </View>
                  <View style={styles.priceField}>
                    <Text style={styles.priceFieldLabel}>Take Profit (optional)</Text>
                    <View style={styles.priceInput}>
                      <Text style={styles.prefix}>$</Text>
                      <TextInput
                        style={styles.priceText}
                        value={takeProfit}
                        onChangeText={setTakeProfit}
                        placeholder="0.00"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                        selectionColor={colors.primary}
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.priceField}>
                  <Text style={styles.priceFieldLabel}>Take Profit (optional)</Text>
                  <View style={styles.priceInput}>
                    <Text style={styles.prefix}>$</Text>
                    <TextInput
                      style={styles.priceText}
                      value={takeProfit}
                      onChangeText={setTakeProfit}
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                      selectionColor={colors.primary}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* ── Quick mode: position summary ─── */}
            {isQuickMode && quickQty > 0 && entry > 0 && (
              <View style={styles.section}>
                <View style={styles.posCard}>
                  <View style={styles.posHeroRow}>
                    <View style={styles.posHero}>
                      <Text style={styles.posHeroNum}>{quickQty}</Text>
                      <Text style={styles.posHeroLabel}>shares</Text>
                    </View>
                    <View style={styles.posDivider} />
                    <View style={styles.posHero}>
                      <Text style={styles.posHeroNum}>{formatCurrency(entry * quickQty)}</Text>
                      <Text style={styles.posHeroLabel}>value</Text>
                    </View>
                  </View>
                  {stop > 0 && quickRiskPerShare > 0 && (
                    <View style={styles.posStatsRow}>
                      <View style={styles.posStat}>
                        <Text style={styles.posStatLabel}>Risk</Text>
                        <Text style={[styles.posStatVal, {
                          color: quickRiskPercent > 3 ? colors.verdictStop : quickRiskPercent > 2 ? colors.verdictWait : colors.verdictProceed,
                        }]}>
                          {formatCurrency(quickTotalRisk)} ({formatPercent(quickRiskPercent)})
                        </Text>
                      </View>
                      <View style={styles.posStat}>
                        <Text style={styles.posStatLabel}>Risk/Share</Text>
                        <Text style={styles.posStatVal}>{formatCurrency(quickRiskPerShare)}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* ── Position Size (compact) — checkpoint mode ─── */}
            {!isQuickMode && hasPositionSize && (
              <View style={styles.section}>
                <Text style={styles.label}>Position Size</Text>
                <View style={styles.posCard}>
                  {/* Top row: shares + value */}
                  <View style={styles.posHeroRow}>
                    <View style={styles.posHero}>
                      <Text style={styles.posHeroNum}>{idealShares}</Text>
                      <Text style={styles.posHeroLabel}>shares</Text>
                    </View>
                    <View style={styles.posDivider} />
                    <View style={styles.posHero}>
                      <Text style={styles.posHeroNum}>{formatCurrency(totalCost)}</Text>
                      <Text style={styles.posHeroLabel}>value</Text>
                    </View>
                  </View>
                  {/* Stats row */}
                  <View style={styles.posStatsRow}>
                    <View style={styles.posStat}>
                      <Text style={styles.posStatLabel}>Risk</Text>
                      <Text style={[styles.posStatVal, {
                        color: riskPercent > 3 ? colors.verdictStop : riskPercent > 2 ? colors.verdictWait : colors.verdictProceed,
                      }]}>
                        {formatCurrency(totalRisk)} ({formatPercent(riskPercent)})
                      </Text>
                    </View>
                    {rrRatio > 0 && (
                      <View style={styles.posStat}>
                        <Text style={styles.posStatLabel}>R:R</Text>
                        <Text style={[styles.posStatVal, {
                          color: rrRatio >= 2 ? colors.verdictProceed : rrRatio >= 1 ? colors.verdictAdjust : colors.verdictStop,
                        }]}>
                          1:{rrRatio.toFixed(1)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.posStat}>
                      <Text style={styles.posStatLabel}>Risk/Share</Text>
                      <Text style={styles.posStatVal}>{formatCurrency(riskPerShare)}</Text>
                    </View>
                  </View>
                  <Text style={styles.posNote}>
                    Based on {formatPercent(maxRiskPerTrade)} max risk of {formatCurrency(accountSize)}
                  </Text>
                </View>
              </View>
            )}

            {/* Hint when no position size yet */}
            {!isQuickMode && !hasPositionSize && entry > 0 && (
              <View style={styles.hintRow}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={colors.primary} strokeWidth={1.5} />
                </Svg>
                <Text style={styles.hintText}>
                  Add stop loss to see position sizing
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.bottom}>
        {isQuickMode ? (
          <Button title="Add Trade" onPress={handleQuickAdd} disabled={!isQuickValid} />
        ) : (
          <Button title="Run Check" onPress={handleRunCheckpoint} disabled={!isValid} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.md,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  section: { gap: spacing.sm },
  label: {
    fontSize: typography.xs,
    fontFamily: typography.semiBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Ticker Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.regular,
    fontSize: typography.base,
    color: colors.textPrimary,
    padding: 0,
  },
  tickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tickerChip: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    width: '48%',
  },
  tickerSymbol: {
    fontSize: typography.sm,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  tickerName: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
    marginTop: 1,
  },

  // ── Selected Ticker + Direction (one row)
  tickerDirectionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  selectedTickerPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  selectedSymbol: {
    fontSize: typography.md,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  selectedName: {
    flex: 1,
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },
  changeLink: {
    fontSize: typography.sm,
    color: colors.primary,
  },
  directionToggle: {
    flexDirection: 'row',
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dirBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  dirBtnBuy: {
    backgroundColor: colors.verdictProceed + '18',
    borderColor: colors.verdictProceed,
  },
  dirBtnSell: {
    backgroundColor: colors.verdictStop + '18',
    borderColor: colors.verdictStop,
  },
  dirText: {
    fontSize: typography.sm,
    fontFamily: typography.bold,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  dirTextActive: {
    color: colors.textPrimary,
  },

  // ── Price Inputs (compact)
  priceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  priceField: {
    flex: 1,
    gap: 4,
  },
  priceFieldLabel: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  prefix: {
    fontFamily: typography.semiBold,
    fontSize: typography.base,
    color: colors.textMuted,
    marginRight: spacing.xs,
  },
  priceText: {
    flex: 1,
    fontFamily: typography.semiBold,
    fontSize: typography.base,
    color: colors.textPrimary,
    padding: 0,
  },

  // ── Position Size (compact card)
  posCard: {
    backgroundColor: colors.primary + '08',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary + '25',
    padding: spacing.md,
    gap: spacing.sm,
  },
  posHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  posHero: {
    flex: 1,
    alignItems: 'center',
  },
  posHeroNum: {
    fontSize: typography.lg,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  posHeroLabel: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  posDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  posStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  posStat: {
    alignItems: 'center',
    gap: 1,
  },
  posStatLabel: {
    fontSize: 10,
    fontFamily: typography.regular,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  posStatVal: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },
  posNote: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // ── Hint
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  hintText: {
    flex: 1,
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },

  // ── Checked Trades
  checkedSection: {
    gap: spacing.sm,
  },
  checkedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearAllText: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },
  checkedCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    padding: spacing.sm + 2,
  },
  checkedCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkedInfo: {
    flex: 1,
    gap: 2,
  },
  checkedTicker: {
    fontSize: typography.sm,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  checkedVerdict: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
  },
  checkedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  takeBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  takeBtnText: {
    fontSize: typography.xs,
    fontFamily: typography.bold,
    color: colors.white,
  },

  bottom: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
});
