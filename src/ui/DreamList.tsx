import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { appStore, useStoreVersion } from '../data/appStore';
import { formatDuration, sleepEndDate, summarizeSleep } from '../data/sleep';
import { normalizeDream, type Dream, type Sleep } from '../data/types';
import { AppIcon, type AppIconName } from './AppIcon';
import { Field, Title, Txt, type PressState } from './components';
import { formatLongDate, formatShortDate } from './dates';
import { colors, fonts, MOOD_LEVELS, optionFor, TIMES_OF_DAY, WEATHERS } from './theme';
import { Moon, WatercolorDot } from './widgets';

const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

type JournalItem = { kind: 'dream'; day: string; dream: Dream } | { kind: 'sleep'; day: string; sleep: Sleep } | { kind: 'day'; day: string };

/** Journal : rêves et sommeils, regroupés par jour (le sommeil d'une nuit est rangé au jour du réveil). */
export function DreamList(props: {
  selectedId: string | null;
  onOpen: (id: string) => void;
  onOpenSleep: (id: string) => void;
  bottomInset: number;
  header?: React.ReactNode;
}) {
  const version = useStoreVersion();
  const [q, setQ] = useState('');
  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    const dreams = appStore.list('dreams').filter((d) => {
      if (!query) return true;
      const n = normalizeDream(d);
      const hay = [d.title, d.text, ...n.tags, ...n.ambiances, ...n.emotions, ...n.dreamTypes, ...n.placeIds.map((id) => appStore.get('places', id)?.name ?? ''), ...n.peopleIds.map((id) => appStore.get('people', id)?.name ?? '')]
        .join(' ')
        .toLowerCase();
      return hay.includes(query);
    });
    const sleeps = query ? [] : appStore.list('sleeps');
    const byDay = new Map<string, { sleeps: Sleep[]; dreams: Dream[] }>();
    const slot = (day: string) => {
      let v = byDay.get(day);
      if (!v) byDay.set(day, (v = { sleeps: [], dreams: [] }));
      return v;
    };
    for (const d of dreams) slot(d.dreamDate).dreams.push(d);
    for (const sl of sleeps) slot(sleepEndDate(sl)).sleeps.push(sl);
    const out: JournalItem[] = [];
    for (const day of [...byDay.keys()].sort((x, y) => y.localeCompare(x))) {
      const v = byDay.get(day)!;
      out.push({ kind: 'day', day });
      v.sleeps.sort((x, y) => (summarizeSleep(x).bed ?? 0) - (summarizeSleep(y).bed ?? 0));
      for (const sl of v.sleeps) out.push({ kind: 'sleep', day, sleep: sl });
      v.dreams.sort((x, y) => x.createdAt.localeCompare(y.createdAt));
      for (const d of v.dreams) out.push({ kind: 'dream', day, dream: d });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, q]);
  const total = appStore.list('dreams').length + appStore.list('sleeps').length;

  return (
    <View style={styles.container}>
      {props.header}
      {total > 0 && (
        <View style={styles.search}>
          <Field value={q} onChangeText={setQ} placeholder="Chercher un rêve, un lieu, une personne…" testID="journal-search" />
        </View>
      )}
      <FlatList
        data={items}
        keyExtractor={(it) => (it.kind === 'day' ? 'day-' + it.day : it.kind === 'sleep' ? it.sleep.id : it.dream.id)}
        contentContainerStyle={[styles.list, { paddingBottom: 16 + props.bottomInset }]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <AppIcon name="logo-grand" size={110} />
            <Title size={22}>{total ? 'Aucun rêve trouvé' : 'Ton journal est vide'}</Title>
            <Txt muted style={{ textAlign: 'center' }}>
              {total ? 'Essaie un autre mot.' : 'Au réveil, touche le micro pour une note rapide, « Rêve » pour tout raconter, ou « Sommeil » pour noter ta nuit.'}
            </Txt>
          </View>
        }
        renderItem={({ item }) =>
          item.kind === 'day' ? (
            <Txt style={styles.dayHeader}>{capitalize(formatLongDate(item.day))}</Txt>
          ) : item.kind === 'sleep' ? (
            <SleepRow sleep={item.sleep} selected={item.sleep.id === props.selectedId} onPress={() => props.onOpenSleep(item.sleep.id)} />
          ) : (
            <DreamRow dream={item.dream} selected={item.dream.id === props.selectedId} onPress={() => props.onOpen(item.dream.id)} />
          )
        }
      />
    </View>
  );
}

function SleepRow({ sleep, selected, onPress }: { sleep: Sleep; selected: boolean; onPress: () => void }) {
  const s = summarizeSleep(sleep);
  const span = [sleep.bedTime ?? sleep.asleepTime, sleep.upTime ?? sleep.wakeTime].filter(Boolean).join(' → ');
  const title = s.isNap ? 'Sieste' : `Nuit du ${formatShortDate(sleep.date).replace(/\s\d{4}$/, '')}`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      testID="sleep-row"
      style={({ pressed, hovered }: PressState) => [
        styles.row,
        styles.sleepRow,
        (pressed || hovered) && { backgroundColor: colors.surfaceHover },
        selected && { backgroundColor: colors.surfaceActive, borderColor: colors.accent },
      ]}
    >
      <AppIcon name="sommeil" size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <Title size={18}>{title}</Title>
        <Txt muted size={15}>
          {[span, s.sleep !== null ? `${formatDuration(s.sleep)} de sommeil` : null, s.interruptions.length ? `${s.interruptions.length} réveil${s.interruptions.length > 1 ? 's' : ''}` : null]
            .filter(Boolean)
            .join(' · ') || 'Heures à compléter'}
        </Txt>
      </View>
    </Pressable>
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
        styles.dreamRow,
      ]}
    >
      <AppIcon name={d.kind === 'quick' ? 'lune-contour' : 'lune-crepuscule'} size={36} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: 4 }}>
      <View style={styles.rowTop}>
        {d.kind === 'quick' && (
          <View style={styles.quick}>
            <AppIcon name="eclair-encre" size={13} />
            <Txt size={12} weight="semi" style={{ color: colors.accentText, lineHeight: 16 }}>
              Note rapide
            </Txt>
          </View>
        )}
        <View style={{ flex: 1 }} />
        {d.colors.slice(0, 4).map((c, i) => (
          <WatercolorDot key={c} color={c} size={16} seed={i + 2} />
        ))}
        {d.lucidity !== null && <AppIcon name={`lucidite-b-${d.lucidity}` as AppIconName} size={18} />}
        {(mood || d.weather.length > 0 || d.timeOfDay.length > 0) && (
          <Txt style={{ fontSize: 15, lineHeight: 20, fontFamily: fonts.body }}>
            {[mood?.emoji, ...d.weather.slice(0, 2).map((w) => optionFor(WEATHERS, w).emoji), d.timeOfDay[0] ? optionFor(TIMES_OF_DAY, d.timeOfDay[0]).emoji : undefined]
              .filter(Boolean)
              .join(' ')}
          </Txt>
        )}
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
      </View>
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
  dayHeader: { color: colors.ochre, fontFamily: fonts.display, fontSize: 16, marginTop: 10, marginLeft: 4 },
  sleepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dreamRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  sleepIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  row: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.borderSoft, paddingVertical: 12, paddingHorizontal: 14, gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quick: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 6 },
  meta: { flexDirection: 'row', gap: 12, marginTop: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24, gap: 8 },
});
