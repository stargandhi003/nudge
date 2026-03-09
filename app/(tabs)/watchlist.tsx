import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { generateId } from '../../src/utils/uuid';
import { colors, typography, spacing, radii } from '../../src/theme';
import { Card } from '../../src/components/ui';
import { useWatchlistStore } from '../../src/stores/useWatchlistStore';
import { WatchlistItem } from '../../src/types/models';
import { Svg, Path, Circle } from 'react-native-svg';

const POPULAR_TICKERS = [
  { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
  { ticker: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Cyclical' },
  { ticker: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology' },
  { ticker: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Cyclical' },
  { ticker: 'META', name: 'Meta Platforms', sector: 'Technology' },
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF', sector: 'ETF' },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust', sector: 'ETF' },
  { ticker: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology' },
  { ticker: 'NFLX', name: 'Netflix Inc.', sector: 'Technology' },
  { ticker: 'JPM', name: 'JPMorgan Chase', sector: 'Financial' },
  { ticker: 'V', name: 'Visa Inc.', sector: 'Financial' },
  { ticker: 'DIS', name: 'Walt Disney Co.', sector: 'Communication' },
  { ticker: 'BA', name: 'Boeing Co.', sector: 'Industrials' },
];

function TickerRow({ item, onRemove }: { item: WatchlistItem; onRemove: () => void }) {
  return (
    <Animated.View entering={FadeInRight.duration(300)}>
      <Card style={styles.tickerCard}>
        <View style={styles.tickerLeft}>
          <View style={styles.tickerBadge}>
            <Text style={styles.tickerBadgeText}>{item.ticker.charAt(0)}</Text>
          </View>
          <View>
            <Text style={styles.tickerSymbol}>{item.ticker}</Text>
            <Text style={styles.tickerName} numberOfLines={1}>{item.name}</Text>
          </View>
        </View>
        <View style={styles.tickerRight}>
          {item.sector && (
            <Text style={styles.sectorTag}>{item.sector}</Text>
          )}
          <TouchableOpacity onPress={onRemove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path d="M18 6L6 18M6 6l12 12" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" />
            </Svg>
          </TouchableOpacity>
        </View>
      </Card>
    </Animated.View>
  );
}

export default function WatchlistScreen() {
  const { items, addItem, removeItem } = useWatchlistStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const filteredSuggestions = POPULAR_TICKERS.filter(
    (t) =>
      !items.some((i) => i.ticker === t.ticker) &&
      (t.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAdd = (ticker: typeof POPULAR_TICKERS[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addItem({
      id: generateId(),
      ticker: ticker.ticker,
      name: ticker.name,
      assetType: 'stock',
      sector: ticker.sector,
      addedAt: new Date().toISOString(),
    });
    setSearchQuery('');
    setShowSearch(false);
  };

  const handleRemove = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removeItem(id);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Watchlist</Text>
        <TouchableOpacity
          onPress={() => setShowSearch(!showSearch)}
          style={styles.addButton}
        >
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path d="M12 5v14M5 12h14" stroke={colors.primary} strokeWidth={2.5} strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
      </View>

      {showSearch && (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Circle cx={11} cy={11} r={8} stroke={colors.textMuted} strokeWidth={2} />
              <Path d="M21 21l-4.35-4.35" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" />
            </Svg>
            <TextInput
              style={styles.searchInput}
              placeholder="Search tickers..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              selectionColor={colors.primary}
            />
          </View>
          {(searchQuery.length > 0 || true) && (
            <View style={styles.suggestions}>
              {filteredSuggestions.slice(0, 6).map((ticker) => (
                <TouchableOpacity
                  key={ticker.ticker}
                  style={styles.suggestionRow}
                  onPress={() => handleAdd(ticker)}
                >
                  <View>
                    <Text style={styles.suggestionTicker}>{ticker.ticker}</Text>
                    <Text style={styles.suggestionName}>{ticker.name}</Text>
                  </View>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path d="M12 5v14M5 12h14" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" />
                  </Svg>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Animated.View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TickerRow item={item} onRemove={() => handleRemove(item.id)} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
              <Path d="M21 15V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10" stroke={colors.textMuted} strokeWidth={1.5} />
              <Path d="M3 15l4-4 3 3 4-4 4 4" stroke={colors.textMuted} strokeWidth={1.5} strokeLinecap="round" />
            </Svg>
            <Text style={styles.emptyTitle}>No tickers yet</Text>
            <Text style={styles.emptyDesc}>Tap + to add tickers you're watching</Text>
          </View>
        }
      />
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
    paddingVertical: spacing.lg,
  },
  title: {
    fontSize: typography.xl,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.regular,
    fontSize: typography.base,
    color: colors.textPrimary,
    padding: 0,
  },
  suggestions: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  suggestionTicker: {
    fontSize: typography.base,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },
  suggestionName: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  listContent: { paddingHorizontal: spacing.xl, gap: spacing.sm, paddingBottom: 120 },
  tickerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  tickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tickerBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tickerBadgeText: {
    fontSize: typography.md,
    fontFamily: typography.bold,
    color: colors.primary,
  },
  tickerSymbol: {
    fontSize: typography.base,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },
  tickerName: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textMuted,
    maxWidth: 160,
  },
  tickerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sectorTag: {
    fontSize: typography.xs,
    fontFamily: typography.semiBold,
    color: colors.textMuted,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
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
  },
});
