import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { appStore, useStoreVersion } from '../data/appStore';
import type { Dream } from '../data/types';
import { Button } from './components';
import { formatShortDate } from './dates';
import { colors } from './theme';

export function DreamList(props: { selectedId: string | null; onOpen: (id: string) => void; onNew: () => void; bottomInset: number }) {
  const version = useStoreVersion();
  const dreams = useMemo(
    () =>
      appStore
        .list('dreams')
        .sort((a, b) => (a.dreamDate === b.dreamDate ? b.createdAt.localeCompare(a.createdAt) : b.dreamDate.localeCompare(a.dreamDate))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button label="Nouveau rêve" icon="add" variant="primary" onPress={props.onNew} testID="new-dream" />
      </View>
      <FlatList
        data={dreams}
        keyExtractor={(d) => d.id}
        contentContainerStyle={[styles.list, { paddingBottom: 16 + props.bottomInset }]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyGlyph}>☾</Text>
            <Text style={styles.emptyText}>Aucun rêve pour l’instant.</Text>
            <Text style={styles.emptyHint}>Appuie sur « Nouveau rêve » pour noter le premier.</Text>
          </View>
        }
        renderItem={({ item }) => <DreamRow dream={item} selected={item.id === props.selectedId} onPress={() => props.onOpen(item.id)} />}
      />
    </View>
  );
}

function DreamRow({ dream, selected, onPress }: { dream: Dream; selected: boolean; onPress: () => void }) {
  const excerpt = dream.text.trim().split('\n')[0];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      testID="dream-row"
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.row,
        (pressed || hovered) && { backgroundColor: colors.surfaceHover },
        selected && { backgroundColor: colors.surfaceActive, borderColor: colors.accent },
      ]}
    >
      <Text style={styles.date}>{formatShortDate(dream.dreamDate)}</Text>
      <Text style={[styles.title, !dream.title.trim() && styles.untitled]} numberOfLines={1}>
        {dream.title.trim() || 'Sans titre'}
      </Text>
      {!!excerpt && (
        <Text style={styles.excerpt} numberOfLines={2}>
          {excerpt}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 12, paddingBottom: 4 },
  list: { padding: 12, gap: 8 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 4,
    minHeight: 56,
  },
  date: { color: colors.muted, fontSize: 13 },
  title: { color: colors.text, fontSize: 17, fontWeight: '600' },
  untitled: { color: colors.faint, fontStyle: 'italic' },
  excerpt: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24, gap: 8 },
  emptyGlyph: { color: colors.accent, fontSize: 48 },
  emptyText: { color: colors.text, fontSize: 17 },
  emptyHint: { color: colors.muted, fontSize: 15, textAlign: 'center' },
});
