import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { appStore, useStoreVersion } from '../data/appStore';
import { normalizeDream, type Dream } from '../data/types';
import { Field, Title, Txt, type PressState } from './components';
import { formatShortDate } from './dates';
import { colors, MOOD_LEVELS } from './theme';
import { Moon, WatercolorDot } from './widgets';

export function DreamList(props: { selectedId: string | null; onOpen: (id: string) => void; bottomInset: number; header?: React.ReactNode }) {
  const version = useStoreVersion();
  const [q, setQ] = useState('');
  const dreams = useMemo(() => {
    const query = q.trim().toLowerCase();
    return appStore
      .list('dreams')
      .filter((d) => {
        if (!query) return true;
        const n = normalizeDream(d);
        const hay = [d.title, d.text, ...n.tags, ...n.ambiances, ...n.placeIds.map((id) => appStore.get('places', id)?.name ?? ''), ...n.peopleIds.map((id) => appStore.get('people', id)?.name ?? '')]
          .join(' ')
          .toLowerCase();
        return hay.includes(query);
      })
      .sort((a, b) => (a.dreamDate === b.dreamDate ? b.createdAt.localeCompare(a.createdAt) : b.dreamDate.localeCompare(a.dreamDate)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, q]);
  const total = appStore.list('dreams').length;

  return (
    <View style={styles.container}>
      {props.header}
      {total > 0 && (
        <View style={styles.search}>
          <Field value={q} onChangeText={setQ} placeholder="Chercher un rêve, un lieu, une personne…" testID="journal-search" />
        </View>
      )}
      <FlatList
        data={dreams}
        keyExtractor={(d) => d.id}
        contentContainerStyle={[styles.list, { paddingBottom: 16 + props.bottomInset }]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Txt style={styles.emptyGlyph}>☾</Txt>
            <Title size={22}>{total ? 'Aucun rêve trouvé' : 'Ton journal est vide'}</Title>
            <Txt muted style={{ textAlign: 'center' }}>
              {total ? 'Essaie un autre mot.' : 'Au réveil, touche le micro pour une note rapide, ou « Nouveau rêve » pour tout raconter.'}
            </Txt>
          </View>
        }
        renderItem={({ item }) => <DreamRow dream={item} selected={item.id === props.selectedId} onPress={() => props.onOpen(item.id)} />}
      />
    </View>
  );
}

function DreamRow({ dream, selected, onPress }: { dream: Dream; selected: boolean; onPress: () => void }) {
  const d = normalizeDream(dream);
  const excerpt = d.text.trim().split('\n')[0];
  const mood = MOOD_LEVELS.find((m) => m.value === d.mood);
  const audio = d.media.filter((m) => m.type === 'audio').length;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      testID="dream-row"
      style={({ pressed, hovered }: PressState) => [
        styles.row,
        (pressed || hovered) && { backgroundColor: colors.surfaceHover },
        selected && { backgroundColor: colors.surfaceActive, borderColor: colors.accent },
      ]}
    >
      <View style={styles.rowTop}>
        <Txt faint size={14}>
          {formatShortDate(d.dreamDate)}
        </Txt>
        {d.kind === 'quick' && (
          <View style={styles.quick}>
            <Ionicons name="flash" size={11} color={colors.accentText} />
            <Txt size={12} weight="semi" style={{ color: colors.accentText, lineHeight: 16 }}>
              Note rapide
            </Txt>
          </View>
        )}
        <View style={{ flex: 1 }} />
        {d.colors.slice(0, 4).map((c, i) => (
          <WatercolorDot key={c} color={c} size={16} seed={i + 2} />
        ))}
        {d.lucidity !== null && <Moon fraction={d.lucidity / 5} size={18} lit={colors.ochre} />}
        {mood && <Ionicons name={mood.icon} size={18} color={colors.ochre} />}
      </View>
      <Title size={19} numberOfLines={1} style={!d.title.trim() && { color: colors.faint, fontStyle: 'italic' }}>
        {d.title.trim() || 'Sans titre'}
      </Title>
      {!!excerpt && (
        <Txt muted size={15} numberOfLines={2}>
          {excerpt}
        </Txt>
      )}
      {(d.placeIds.length > 0 || d.peopleIds.length > 0 || audio > 0) && (
        <View style={styles.meta}>
          {d.placeIds.length > 0 && <Meta icon="location-outline" text={String(d.placeIds.length)} />}
          {d.peopleIds.length > 0 && <Meta icon="people-outline" text={String(d.peopleIds.length)} />}
          {audio > 0 && <Meta icon="mic-outline" text={String(audio)} />}
        </View>
      )}
    </Pressable>
  );
}

function Meta(props: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={props.icon} size={14} color={colors.faint} />
      <Txt faint size={13}>
        {props.text}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  search: { paddingHorizontal: 12, paddingTop: 12 },
  list: { padding: 12, gap: 8 },
  row: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.borderSoft, paddingVertical: 12, paddingHorizontal: 14, gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quick: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 6 },
  meta: { flexDirection: 'row', gap: 12, marginTop: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24, gap: 8 },
  emptyGlyph: { color: colors.accent, fontSize: 48, lineHeight: 56 },
});
