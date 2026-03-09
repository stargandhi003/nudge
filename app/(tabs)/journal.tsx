import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Svg, Path, Circle } from 'react-native-svg';
import { format } from 'date-fns';

import { colors, typography, spacing, radii } from '../../src/theme';
import { Card, Button } from '../../src/components/ui';
import { useJournalStore } from '../../src/stores/useJournalStore';
import { useTradeRecordStore } from '../../src/stores/useTradeRecordStore';
import {
  JournalEntry,
  JournalCategory,
  JOURNAL_CATEGORY_OPTIONS,
  EmotionTag,
  EMOTION_OPTIONS,
  SETUP_OPTIONS,
  TradeRecord,
} from '../../src/types/models';
import { generateId } from '../../src/utils/uuid';
import { formatCurrency } from '../../src/utils/formatting';

// ─── Helpers ────────────────────────────────────────────────────
function toLocalDateStr(isoStr: string): string {
  const d = new Date(isoStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getEmotionEmoji(tag?: string): string {
  if (!tag) return '';
  const found = EMOTION_OPTIONS.find((e) => e.value === tag);
  return found ? found.emoji : '';
}

function getEmotionLabel(tag?: string): string {
  if (!tag) return '';
  const found = EMOTION_OPTIONS.find((e) => e.value === tag);
  return found ? found.label : tag;
}

function getSetupLabel(tag?: string): string {
  if (!tag) return '';
  const found = SETUP_OPTIONS.find((s) => s.value === tag);
  return found ? found.label : tag;
}

function getCategoryEmoji(cat: JournalCategory): string {
  const found = JOURNAL_CATEGORY_OPTIONS.find((c) => c.value === cat);
  return found ? found.emoji : '📝';
}

function getCategoryLabel(cat: JournalCategory): string {
  const found = JOURNAL_CATEGORY_OPTIONS.find((c) => c.value === cat);
  return found ? found.label : cat;
}

// ─── Unified Timeline Item ──────────────────────────────────────
type TimelineItem =
  | { type: 'journal'; data: JournalEntry; timestamp: string }
  | { type: 'trade'; data: TradeRecord; timestamp: string };

// ─── Filter Tabs ────────────────────────────────────────────────
type FilterType = 'all' | 'journal' | 'trades';

// ─── Icons ──────────────────────────────────────────────────────
function PlusIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={colors.white} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

function PenIcon({ color = colors.textMuted }: { color?: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Linked Trade Mini Card ─────────────────────────────────────
function LinkedTradeMini({ trade }: { trade: TradeRecord }) {
  const isBuy = trade.trade.direction === 'buy';
  const isClosed = trade.status === 'closed';
  const pnl = trade.pnlDollars ?? 0;
  return (
    <View style={styles.linkedTradeCard}>
      <View style={styles.linkedTradeRow}>
        <Text style={styles.linkedTradeTicker}>{trade.trade.ticker}</Text>
        <View style={[styles.dirBadge, { backgroundColor: isBuy ? colors.marketUp + '18' : colors.marketDown + '18' }]}>
          <Text style={[styles.dirBadgeText, { color: isBuy ? colors.marketUp : colors.marketDown }]}>
            {isBuy ? 'BUY' : 'SELL'}
          </Text>
        </View>
        {isClosed && (
          <Text style={[styles.linkedTradePnl, { color: pnl >= 0 ? colors.marketUp : colors.marketDown }]}>
            {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
          </Text>
        )}
      </View>
      <Text style={styles.linkedTradeDetail}>
        {trade.trade.quantity} shares @ {formatCurrency(trade.trade.entryPrice)}
      </Text>
    </View>
  );
}

// ─── Trade Journal Card ─────────────────────────────────────────
function TradeJournalCard({ trade, onEdit, onWriteAbout }: { trade: TradeRecord; onEdit: () => void; onWriteAbout: () => void }) {
  const isBuy = trade.trade.direction === 'buy';
  const isClosed = trade.status === 'closed';
  const pnl = trade.pnlDollars ?? 0;
  const hasEntryJournal = trade.entryEmotion || trade.entryNote || trade.setupTag;
  const hasExitJournal = trade.exitEmotion || trade.exitNote;

  // Check if any standalone journal entries are linked to this trade
  const allEntries = useJournalStore((s) => s.entries);
  const linkedEntries = useMemo(() => allEntries.filter((e) => e.tradeRecordId === trade.id), [allEntries, trade.id]);

  return (
    <View style={styles.timelineCard}>
      {/* Card header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.typeIndicator, { backgroundColor: colors.primary + '20' }]}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
              <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={colors.primary} strokeWidth={2} />
            </Svg>
          </View>
          <Text style={styles.tradeTicker}>{trade.trade.ticker}</Text>
          <View style={[styles.dirBadge, { backgroundColor: isBuy ? colors.marketUp + '18' : colors.marketDown + '18' }]}>
            <Text style={[styles.dirBadgeText, { color: isBuy ? colors.marketUp : colors.marketDown }]}>
              {isBuy ? 'BUY' : 'SELL'}
            </Text>
          </View>
          {isClosed && (
            <Text style={[styles.tradePnl, { color: pnl >= 0 ? colors.marketUp : colors.marketDown }]}>
              {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <PenIcon color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Entry journal */}
      {hasEntryJournal && (
        <View style={styles.journalContent}>
          <Text style={styles.journalPhase}>Entry</Text>
          <View style={styles.tagRow}>
            {trade.entryEmotion && (
              <View style={styles.tag}>
                <Text style={styles.tagEmoji}>{getEmotionEmoji(trade.entryEmotion)}</Text>
                <Text style={styles.tagText}>{getEmotionLabel(trade.entryEmotion)}</Text>
              </View>
            )}
            {trade.setupTag && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{getSetupLabel(trade.setupTag)}</Text>
              </View>
            )}
            <View style={[styles.tag, { backgroundColor: trade.isPlanned ? colors.primary + '18' : colors.verdictWait + '18' }]}>
              <Text style={[styles.tagText, { color: trade.isPlanned ? colors.primary : colors.verdictWait }]}>
                {trade.isPlanned ? 'Planned' : 'Unplanned'}
              </Text>
            </View>
          </View>
          {trade.entryNote ? (
            <Text style={styles.noteText}>{trade.entryNote}</Text>
          ) : null}
        </View>
      )}

      {/* Exit journal */}
      {hasExitJournal && (
        <View style={styles.journalContent}>
          <Text style={styles.journalPhase}>Exit</Text>
          <View style={styles.tagRow}>
            {trade.exitEmotion && (
              <View style={styles.tag}>
                <Text style={styles.tagEmoji}>{getEmotionEmoji(trade.exitEmotion)}</Text>
                <Text style={styles.tagText}>{getEmotionLabel(trade.exitEmotion)}</Text>
              </View>
            )}
          </View>
          {trade.exitNote ? (
            <Text style={styles.noteText}>{trade.exitNote}</Text>
          ) : null}
        </View>
      )}

      {/* Linked journal entries */}
      {linkedEntries.length > 0 && (
        <View style={styles.linkedEntriesSection}>
          <Text style={styles.journalPhase}>Linked Notes</Text>
          {linkedEntries.map((entry) => (
            <View key={entry.id} style={styles.linkedEntryRow}>
              <Text style={styles.linkedEntryEmoji}>{getCategoryEmoji(entry.category)}</Text>
              <Text style={styles.linkedEntryTitle} numberOfLines={1}>
                {entry.title || entry.content.substring(0, 50)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* No journal yet prompt */}
      {!hasEntryJournal && !hasExitJournal && (
        <TouchableOpacity onPress={onEdit} activeOpacity={0.7}>
          <View style={styles.noJournalPrompt}>
            <PenIcon color={colors.textMuted} />
            <Text style={styles.noJournalText}>Add journal entry for this trade</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Write about this trade */}
      <View style={styles.tradeActions}>
        <TouchableOpacity onPress={onWriteAbout} activeOpacity={0.7} style={styles.writeAboutBtn}>
          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
            <Path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" />
          </Svg>
          <Text style={styles.writeAboutText}>Write about this trade</Text>
        </TouchableOpacity>
      </View>

      {/* Timestamp */}
      <Text style={styles.timestamp}>
        {format(new Date(trade.createdAt), 'MMM d, h:mm a')}
      </Text>
    </View>
  );
}

// ─── Standalone Journal Card ────────────────────────────────────
function StandaloneJournalCard({ entry, onEdit }: { entry: JournalEntry; onEdit: () => void }) {
  // Look up linked trade if one exists
  const tradeRecords = useTradeRecordStore((s) => s.records);
  const linkedTrade = entry.tradeRecordId
    ? tradeRecords.find((r) => r.id === entry.tradeRecordId)
    : undefined;

  return (
    <View style={styles.timelineCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.typeIndicator, { backgroundColor: colors.verdictAdjust + '20' }]}>
            <Text style={{ fontSize: 14 }}>{getCategoryEmoji(entry.category)}</Text>
          </View>
          <Text style={styles.journalTitle}>{entry.title || getCategoryLabel(entry.category)}</Text>
          {entry.emotion && (
            <View style={styles.tag}>
              <Text style={styles.tagEmoji}>{getEmotionEmoji(entry.emotion)}</Text>
              <Text style={styles.tagText}>{getEmotionLabel(entry.emotion)}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <PenIcon color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Linked trade reference */}
      {linkedTrade && <LinkedTradeMini trade={linkedTrade} />}

      {entry.content ? (
        <Text style={styles.noteText}>{entry.content}</Text>
      ) : null}

      <Text style={styles.timestamp}>
        {format(new Date(entry.createdAt), 'MMM d, h:mm a')}
      </Text>
    </View>
  );
}

// ─── New Entry Modal ────────────────────────────────────────────
function NewEntryModal({
  visible,
  onClose,
  editingEntry,
  linkedTradeId,
}: {
  visible: boolean;
  onClose: () => void;
  editingEntry?: JournalEntry | null;
  linkedTradeId?: string | null;
}) {
  const addEntry = useJournalStore((s) => s.addEntry);
  const updateEntry = useJournalStore((s) => s.updateEntry);
  const tradeRecords = useTradeRecordStore((s) => s.records);

  const [category, setCategory] = useState<JournalCategory>(editingEntry?.category ?? 'reflection');
  const [title, setTitle] = useState(editingEntry?.title ?? '');
  const [content, setContent] = useState(editingEntry?.content ?? '');
  const [emotion, setEmotion] = useState<EmotionTag | null>(editingEntry?.emotion ?? null);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(editingEntry?.tradeRecordId ?? linkedTradeId ?? null);

  // Get today's trades for the attach section
  const todayTrades = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return tradeRecords.filter((r) => {
      const d = new Date(r.createdAt);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return dateStr === todayStr && r.status !== 'cancelled';
    });
  }, [tradeRecords]);

  // Reset when modal opens/closes or entry changes
  const resetForm = useCallback(() => {
    setCategory(editingEntry?.category ?? 'reflection');
    setTitle(editingEntry?.title ?? '');
    setContent(editingEntry?.content ?? '');
    setEmotion(editingEntry?.emotion ?? null);
    setSelectedTradeId(editingEntry?.tradeRecordId ?? linkedTradeId ?? null);
  }, [editingEntry, linkedTradeId]);

  const handleSave = () => {
    if (!content.trim() && !title.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (editingEntry) {
      updateEntry(editingEntry.id, {
        category,
        title: title.trim(),
        content: content.trim(),
        emotion: emotion || undefined,
        tradeRecordId: selectedTradeId || undefined,
      });
    } else {
      const entry: JournalEntry = {
        id: generateId(),
        category,
        title: title.trim(),
        content: content.trim(),
        emotion: emotion || undefined,
        tradeRecordId: selectedTradeId || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addEntry(entry);
    }

    onClose();
    resetForm();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onShow={resetForm}
    >
      <SafeAreaView style={styles.modalContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingEntry ? 'Edit Entry' : 'New Journal Entry'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={!content.trim() && !title.trim()}>
              <Text style={[
                styles.modalSave,
                (!content.trim() && !title.trim()) && styles.modalSaveDisabled,
              ]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Link a Trade — show today's trades */}
            {todayTrades.length > 0 && (
              <>
                <Text style={styles.modalSectionLabel}>Link a Trade (Optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tradePickerScroll} contentContainerStyle={styles.tradePickerContent}>
                  {todayTrades.map((trade) => {
                    const isSelected = selectedTradeId === trade.id;
                    const isBuy = trade.trade.direction === 'buy';
                    const pnl = trade.pnlDollars ?? 0;
                    const isClosed = trade.status === 'closed';
                    return (
                      <TouchableOpacity
                        key={trade.id}
                        style={[styles.tradePickerItem, isSelected && styles.tradePickerItemSelected]}
                        onPress={() => setSelectedTradeId(isSelected ? null : trade.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.tradePickerRow}>
                          <Text style={[styles.tradePickerTicker, isSelected && { color: colors.primary }]}>
                            {trade.trade.ticker}
                          </Text>
                          <View style={[styles.dirBadge, { backgroundColor: isBuy ? colors.marketUp + '18' : colors.marketDown + '18' }]}>
                            <Text style={[styles.dirBadgeText, { color: isBuy ? colors.marketUp : colors.marketDown }]}>
                              {isBuy ? 'B' : 'S'}
                            </Text>
                          </View>
                        </View>
                        {isClosed && (
                          <Text style={[styles.tradePickerPnl, { color: pnl >= 0 ? colors.marketUp : colors.marketDown }]}>
                            {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                          </Text>
                        )}
                        {!isClosed && (
                          <Text style={styles.tradePickerStatus}>Open</Text>
                        )}
                        {isSelected && (
                          <View style={styles.tradePickerCheck}>
                            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                              <Path d="M20 6L9 17l-5-5" stroke={colors.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* Category Selector */}
            <Text style={styles.modalSectionLabel}>Category</Text>
            <View style={styles.categoryRow}>
              {JOURNAL_CATEGORY_OPTIONS.map((opt) => {
                const isSelected = category === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                    onPress={() => setCategory(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.categoryEmoji}>{opt.emoji}</Text>
                    <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Title */}
            <Text style={styles.modalSectionLabel}>Title (Optional)</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Market felt choppy today..."
              placeholderTextColor={colors.textMuted}
              maxLength={100}
              selectionColor={colors.primary}
            />

            {/* Content */}
            <Text style={styles.modalSectionLabel}>Your thoughts</Text>
            <TextInput
              style={styles.contentInput}
              value={content}
              onChangeText={setContent}
              placeholder="Write about what happened today, what you learned, or what you plan to do differently..."
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
              maxLength={1000}
              selectionColor={colors.primary}
            />
            <Text style={styles.charCount}>{content.length}/1000</Text>

            {/* Emotion */}
            <Text style={styles.modalSectionLabel}>How are you feeling?</Text>
            <View style={styles.emotionGrid}>
              {EMOTION_OPTIONS.map((opt) => {
                const isSelected = emotion === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.emotionChip, isSelected && styles.emotionChipSelected]}
                    onPress={() => setEmotion(isSelected ? null : opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emotionEmoji}>{opt.emoji}</Text>
                    <Text style={[styles.emotionLabel, isSelected && styles.emotionLabelSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Edit Trade Journal Modal ───────────────────────────────────
function EditTradeJournalModal({
  visible,
  onClose,
  trade,
}: {
  visible: boolean;
  onClose: () => void;
  trade: TradeRecord | null;
}) {
  const updateJournal = useTradeRecordStore((s) => s.updateJournal);

  const [entryEmotion, setEntryEmotion] = useState<EmotionTag | null>(null);
  const [entryNote, setEntryNote] = useState('');
  const [setupTag, setSetupTag] = useState<string | null>(null);
  const [isPlanned, setIsPlanned] = useState(true);

  const resetForm = useCallback(() => {
    if (trade) {
      setEntryEmotion(trade.entryEmotion ?? null);
      setEntryNote(trade.entryNote ?? '');
      setSetupTag(trade.setupTag ?? null);
      setIsPlanned(trade.isPlanned);
    }
  }, [trade]);

  const handleSave = () => {
    if (!trade) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    updateJournal(trade.id, {
      entryEmotion: entryEmotion || undefined,
      entryNote: entryNote.trim() || undefined,
      setupTag: (setupTag as any) || undefined,
      isPlanned,
    });

    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onShow={resetForm}
    >
      <SafeAreaView style={styles.modalContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              Edit Trade Journal
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Trade context */}
            {trade && (
              <View style={styles.tradeContext}>
                <Text style={styles.tradeContextTicker}>
                  {trade.trade.direction.toUpperCase()} {trade.trade.ticker}
                </Text>
                <Text style={styles.tradeContextDetail}>
                  {trade.trade.quantity} shares @ {formatCurrency(trade.trade.entryPrice)}
                </Text>
              </View>
            )}

            {/* Entry Emotion */}
            <Text style={styles.modalSectionLabel}>Entry Emotion</Text>
            <View style={styles.emotionGrid}>
              {EMOTION_OPTIONS.map((opt) => {
                const isSelected = entryEmotion === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.emotionChip, isSelected && styles.emotionChipSelected]}
                    onPress={() => setEntryEmotion(isSelected ? null : opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emotionEmoji}>{opt.emoji}</Text>
                    <Text style={[styles.emotionLabel, isSelected && styles.emotionLabelSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Setup Tag */}
            <Text style={styles.modalSectionLabel}>Setup Type</Text>
            <View style={styles.setupGrid}>
              {SETUP_OPTIONS.map((opt) => {
                const isSelected = setupTag === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.setupChip, isSelected && styles.setupChipSelected]}
                    onPress={() => setSetupTag(isSelected ? null : opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.setupLabel, isSelected && styles.setupLabelSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Planned / Unplanned */}
            <Text style={styles.modalSectionLabel}>Trade Plan</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, styles.toggleBtnLeft, isPlanned && styles.toggleBtnActive]}
                onPress={() => setIsPlanned(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.toggleText, isPlanned && styles.toggleTextActive]}>
                  Planned
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, styles.toggleBtnRight, !isPlanned && styles.toggleBtnActive]}
                onPress={() => setIsPlanned(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.toggleText, !isPlanned && styles.toggleTextActive]}>
                  Unplanned
                </Text>
              </TouchableOpacity>
            </View>

            {/* Entry Note */}
            <Text style={styles.modalSectionLabel}>Note</Text>
            <TextInput
              style={styles.contentInput}
              value={entryNote}
              onChangeText={setEntryNote}
              placeholder="Notes about why you took this trade, your thought process..."
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
              maxLength={500}
              selectionColor={colors.primary}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Main Component ─────────────────────────────────────────────
export default function JournalScreen() {
  const router = useRouter();

  // Subscribe to data for reactivity
  const journalEntries = useJournalStore((s) => s.entries);
  const tradeRecords = useTradeRecordStore((s) => s.records);

  const [filter, setFilter] = useState<FilterType>('all');
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [editingJournalEntry, setEditingJournalEntry] = useState<JournalEntry | null>(null);
  const [editingTrade, setEditingTrade] = useState<TradeRecord | null>(null);
  const [linkedTradeId, setLinkedTradeId] = useState<string | null>(null);

  // Build unified timeline
  const timeline = useMemo(() => {
    const items: TimelineItem[] = [];

    // Add standalone journal entries
    if (filter !== 'trades') {
      journalEntries.forEach((entry) => {
        items.push({ type: 'journal', data: entry, timestamp: entry.createdAt });
      });
    }

    // Add trade records (only non-cancelled)
    if (filter !== 'journal') {
      tradeRecords
        .filter((r) => r.status !== 'cancelled')
        .forEach((trade) => {
          items.push({ type: 'trade', data: trade, timestamp: trade.createdAt });
        });
    }

    // Sort by timestamp (newest first)
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return items;
  }, [journalEntries, tradeRecords, filter]);

  // Group by date
  const groupedTimeline = useMemo(() => {
    const groups: { date: string; displayDate: string; items: TimelineItem[] }[] = [];
    const map: Record<string, TimelineItem[]> = {};

    timeline.forEach((item) => {
      const dateStr = toLocalDateStr(item.timestamp);
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(item);
    });

    const today = toLocalDateStr(new Date().toISOString());
    const yesterday = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return toLocalDateStr(d.toISOString());
    })();

    Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .forEach(([date, items]) => {
        let displayDate: string;
        if (date === today) {
          displayDate = 'Today';
        } else if (date === yesterday) {
          displayDate = 'Yesterday';
        } else {
          const [y, m, d] = date.split('-').map(Number);
          displayDate = format(new Date(y, m - 1, d), 'EEEE, MMM d');
        }
        groups.push({ date, displayDate, items });
      });

    return groups;
  }, [timeline]);

  const handleEditJournal = (entry: JournalEntry) => {
    setEditingJournalEntry(entry);
    setShowNewEntry(true);
  };

  const handleEditTrade = (trade: TradeRecord) => {
    setEditingTrade(trade);
  };

  const handleWriteAboutTrade = (trade: TradeRecord) => {
    setLinkedTradeId(trade.id);
    setEditingJournalEntry(null);
    setShowNewEntry(true);
  };

  const handleCloseNewEntry = () => {
    setShowNewEntry(false);
    setEditingJournalEntry(null);
    setLinkedTradeId(null);
  };

  const handleCloseTradeEdit = () => {
    setEditingTrade(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Journal</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setEditingJournalEntry(null);
            setLinkedTradeId(null);
            setShowNewEntry(true);
          }}
          activeOpacity={0.8}
        >
          <PlusIcon />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['all', 'journal', 'trades'] as FilterType[]).map((f) => {
          const isActive = filter === f;
          const labels: Record<FilterType, string> = { all: 'All', journal: 'Notes', trades: 'Trades' };
          return (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                {labels[f]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Timeline */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {groupedTimeline.length > 0 ? (
          groupedTimeline.map((group, gi) => (
            <Animated.View key={group.date} entering={FadeInDown.delay(gi * 80).duration(300)}>
              {/* Date Header */}
              <View style={styles.dateHeader}>
                <View style={styles.dateLine} />
                <Text style={styles.dateText}>{group.displayDate}</Text>
                <View style={styles.dateLine} />
              </View>

              {/* Items for this date */}
              <View style={styles.dayItems}>
                {group.items.map((item) => {
                  if (item.type === 'journal') {
                    return (
                      <StandaloneJournalCard
                        key={`j-${item.data.id}`}
                        entry={item.data}
                        onEdit={() => handleEditJournal(item.data)}
                      />
                    );
                  } else {
                    return (
                      <TradeJournalCard
                        key={`t-${item.data.id}`}
                        trade={item.data}
                        onEdit={() => handleEditTrade(item.data)}
                        onWriteAbout={() => handleWriteAboutTrade(item.data)}
                      />
                    );
                  }
                })}
              </View>
            </Animated.View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📔</Text>
            <Text style={styles.emptyTitle}>
              {filter === 'journal' ? 'No journal entries yet' : filter === 'trades' ? 'No trades yet' : 'Your journal is empty'}
            </Text>
            <Text style={styles.emptyDesc}>
              {filter === 'journal'
                ? 'Tap + to write your first reflection, market observation, or lesson learned.'
                : filter === 'trades'
                ? 'Trades will appear here as you log them through the checkpoint flow.'
                : 'Start by adding a journal entry or running a pre-trade checkpoint.'}
            </Text>
            {filter !== 'trades' && (
              <Button
                title="Write First Entry"
                onPress={() => {
                  setEditingJournalEntry(null);
                  setLinkedTradeId(null);
                  setShowNewEntry(true);
                }}
                variant="secondary"
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <NewEntryModal
        visible={showNewEntry}
        onClose={handleCloseNewEntry}
        editingEntry={editingJournalEntry}
        linkedTradeId={linkedTradeId}
      />

      <EditTradeJournalModal
        visible={editingTrade !== null}
        onClose={handleCloseTradeEdit}
        trade={editingTrade}
      />
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  screenTitle: {
    fontSize: typography.xl,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Filter tabs
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterTab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textMuted,
  },
  filterTabTextActive: {
    color: colors.primary,
  },

  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120,
  },

  // Date headers
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dateText: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Day items
  dayItems: {
    gap: spacing.sm,
  },

  // Timeline Card (shared)
  timelineCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  typeIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Trade card specifics
  tradeTicker: {
    fontSize: typography.base,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  dirBadge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
  },
  dirBadgeText: {
    fontSize: 10,
    fontFamily: typography.bold,
    letterSpacing: 0.5,
  },
  tradePnl: {
    fontSize: typography.sm,
    fontFamily: typography.bold,
  },

  // Standalone journal specifics
  journalTitle: {
    fontSize: typography.base,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
    flex: 1,
  },

  // Journal content
  journalContent: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  journalPhase: {
    fontSize: 9,
    fontFamily: typography.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHover,
  },
  tagEmoji: {
    fontSize: 12,
  },
  tagText: {
    fontSize: typography.xs,
    fontFamily: typography.semiBold,
    color: colors.textSecondary,
  },
  noteText: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  noJournalPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  noJournalText: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  timestamp: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
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
    lineHeight: 20,
    maxWidth: 280,
  },

  // ─── Modal ────────────────────────────────────────────────────
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCancel: {
    fontSize: typography.base,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  modalTitle: {
    fontSize: typography.md,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },
  modalSave: {
    fontSize: typography.base,
    fontFamily: typography.semiBold,
    color: colors.primary,
  },
  modalSaveDisabled: {
    color: colors.textMuted,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  modalSectionLabel: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },

  // Category
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  categoryEmoji: {
    fontSize: 14,
  },
  categoryLabel: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textMuted,
  },
  categoryLabelSelected: {
    color: colors.primary,
  },

  // Title input
  titleInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.base,
    fontFamily: typography.semiBold,
    color: colors.textPrimary,
  },

  // Content input
  contentInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.base,
    fontFamily: typography.regular,
    color: colors.textPrimary,
    minHeight: 120,
    maxHeight: 200,
  },
  charCount: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
    alignSelf: 'flex-end',
    marginTop: -spacing.sm,
  },

  // Emotion chips (modal)
  emotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  emotionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emotionChipSelected: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  emotionEmoji: {
    fontSize: 14,
  },
  emotionLabel: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },
  emotionLabelSelected: {
    color: colors.primaryLight,
    fontFamily: typography.semiBold,
  },

  // Setup chips (modal)
  setupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  setupChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  setupChipSelected: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  setupLabel: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },
  setupLabelSelected: {
    color: colors.primaryLight,
    fontFamily: typography.semiBold,
  },

  // Toggle (Planned/Unplanned)
  toggleRow: {
    flexDirection: 'row',
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.transparent,
  },
  toggleBtnLeft: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  toggleBtnRight: {},
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: typography.sm,
    fontFamily: typography.semiBold,
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.white,
  },

  // Trade context (edit modal)
  tradeContext: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  tradeContextTicker: {
    fontSize: typography.md,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  tradeContextDetail: {
    fontSize: typography.sm,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },

  // ─── Trade Picker (Link a Trade in new entry modal) ───────────
  tradePickerScroll: {
    marginHorizontal: -spacing.xl,
  },
  tradePickerContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  tradePickerItem: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 100,
    alignItems: 'center',
    gap: 4,
  },
  tradePickerItemSelected: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  tradePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tradePickerTicker: {
    fontSize: typography.sm,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  tradePickerPnl: {
    fontSize: typography.xs,
    fontFamily: typography.semiBold,
  },
  tradePickerStatus: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },
  tradePickerCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
  },

  // ─── Linked Trade Mini Card (on standalone journal cards) ─────
  linkedTradeCard: {
    backgroundColor: colors.primary + '10',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 2,
  },
  linkedTradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  linkedTradeTicker: {
    fontSize: typography.sm,
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  linkedTradePnl: {
    fontSize: typography.xs,
    fontFamily: typography.semiBold,
  },
  linkedTradeDetail: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textMuted,
  },

  // ─── Linked Journal Entries (on trade cards) ──────────────────
  linkedEntriesSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  linkedEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  linkedEntryEmoji: {
    fontSize: 12,
  },
  linkedEntryTitle: {
    fontSize: typography.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    flex: 1,
  },

  // ─── Write About Trade Button ─────────────────────────────────
  tradeActions: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  writeAboutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  writeAboutText: {
    fontSize: typography.xs,
    fontFamily: typography.semiBold,
    color: colors.primary,
  },
});
