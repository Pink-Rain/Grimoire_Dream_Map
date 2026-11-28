/**
 * Journal : recherche, calendrier (PC : le mois ; téléphone : la semaine, dépliable), filtres et liste des entrées
 * (rêves, notes rapides, nuits), groupées par jour.
 */
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { appStore, useStoreVersion } from '../data/appStore';
import { formatDuration, sleepTitle, summarizeSleep, trackerSegments } from '../data/sleep';
import { localDateString } from '../data/records';
import { normalizeDream, type Dream, type Sleep } from '../data/types';
import { AppIcon, type AppIconName } from './AppIcon';
import { MonthCalendar, monthOf, WeekStrip } from './Calendar';
import { Field, Title, Txt, type PressState } from './components';
import { formatLongDate } from './dates';
import { dayMarks, journalEntries, setJournalFilter, setJournalQuery, useJournalState, type JournalEntry, type JournalFilter } from './journalState';
import { SleepRibbonRow } from './SleepRibbon';
import { colors, fonts, moodImageFor } from './theme';
import { ColorStain } from './widgets';

const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const FILTERS: { value: JournalFilter; label: string; short?: string; image: AppIconName; imageOn?: AppIconName }[] = [
  { value: 'all', label: 'Tout', image: 'filtre-tout', imageOn: 'filtre-tout-encre' },
  { value: 'dreams', label: 'Rêves', image: 'lune-crepuscule' },
  { value: 'quick', label: 'Notes rapides', short: 'Notes', image: 'lune-contour' },
  { value: 'sleeps', label: 'Sommeils', image: 'sommeil', imageOn: 'sommeil-encre' },
  { value: 'lucid', label: 'Lucides', image: 'filtre-lucides', imageOn: 'filtre-lucides-encre' },
];

export function Journal(props: {
  phone: boolean;
  selected: { kind: 'dream' | 'sleep'; id: string } | null;
  onOpenDream: (id: string) => void;
  onOpenSleep: (id: string) => void;
  bottomInset: number;
}) {
  const version = useStoreVersion();
  const { filter, query } = useJournalState();
  const [picked, setPicked] = useState<string | null>(null);
  const [month, setMonth] = useState(monthOf(localDateString()));
  const [expanded, setExpanded] = useState(false);
  const list = useRef<SectionList<JournalEntry> | null>(null);

  const entries = useMemo(() => journalEntries(filter, query), [version, filter, query]);
  const marks = useMemo(() => dayMarks(), [version]);
  const sections = useMemo(() => {
    const out: { day: string; data: JournalEntry[] }[] = [];
    for (const e of entries) {
      const last = out[out.length - 1];
      if (last && last.day === e.day) last.data.push(e);
      else out.push({ day: e.day, data: [e] });
    }
    return out;
  }, [entries]);
  const selectedDay = picked ?? (props.selected ? entries.find((e) => e.kind === props.selected!.kind && e.id === props.selected!.id)?.day ?? null : null);
  const total = appStore.list('dreams').length + appStore.list('sleeps').length;

  function pickDay(day: string) {
    setPicked(day);
    setMonth(monthOf(day));
    // On descend jusqu'à ce jour (ou le jour noté juste avant).
    const i = sections.findIndex((s) => s.day <= day);
    if (i >= 0) {
      try {
        list.current?.scrollToLocation({ sectionIndex: i, itemIndex: 0, viewOffset: 34, animated: true });
      } catch {}
    }
  }
  const today = () => pickDay(localDateString());

  const calendar = props.phone && !expanded ? (
    <WeekStrip day={picked ?? localDateString()} selected={selectedDay} marks={marks} onPick={pickDay} onExpand={() => setExpanded(true)} onToday={today} />
  ) : (
    <MonthCalendar month={month} selected={selectedDay} marks={marks} onPick={pickDay} onMonth={setMonth} onToday={today} onCollapse={props.phone ? () => setExpanded(false) : undefined} />
  );

  const filters = (
    <ScrollView horizontal={props.phone} showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filters, !props.phone && { flexWrap: 'wrap' }]} style={{ flexGrow: 0 }}>
      {FILTERS.map((f) => {
        const on = f.value === filter;
        return (
          <Pressable
            key={f.value}
            onPress={() => setJournalFilter(f.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            testID={`filter-${f.value}`}
            style={({ hovered }: PressState) => [styles.filter, on && styles.filterOn, hovered && !on && { backgroundColor: colors.surfaceHover }]}
          >
            <AppIcon name={on && f.imageOn ? f.imageOn : f.image} size={20} />
            <Txt size={15} weight={on ? 'semi' : undefined} style={on ? { color: colors.accentText } : undefined}>
              {props.phone && f.short ? f.short : f.label}
            </Txt>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.top, props.phone && styles.topPhone]}>
        {total > 0 && (
          <View style={styles.search}>
            <AppIcon name="rechercher" size={22} />
            <Field value={query} onChangeText={setJournalQuery} placeholder="Chercher un rêve, un lieu, une personne…" style={styles.searchField} testID="journal-search" />
          </View>
        )}
        {calendar}
        {filters}
      </View>
      <SectionList
        ref={list}
        sections={sections}
        keyExtractor={(e) => e.kind + e.id}
        initialNumToRender={400}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[styles.list, { paddingBottom: 16 + props.bottomInset }]}
        renderSectionHeader={({ section }) => <Txt style={styles.dayHeader}>{capitalize(formatLongDate(section.day))}</Txt>}
        ListEmptyComponent={
          <View style={styles.empty}>
            <AppIcon name="logo-grand" size={100} />
            <Title size={22}>{total ? 'Rien à afficher ici' : 'Ton journal est vide'}</Title>
            <Txt muted style={{ textAlign: 'center' }}>
              {total ? 'Essaie un autre mot ou un autre filtre.' : 'Au réveil, note une note rapide, un rêve ou ta nuit avec le bouton « + ».'}
            </Txt>
          </View>
        }
        renderItem={({ item }) => {
          const sel = props.selected?.kind === item.kind && props.selected.id === item.id;
          return item.kind === 'sleep' ? (
            <SleepRow sleep={item.sleep} selected={sel} onPress={() => props.onOpenSleep(item.id)} />
          ) : (
            <DreamRow dream={item.dream} selected={sel} onPress={() => props.onOpenDream(item.id)} />
          );
        }}
      />
    </View>
  );
}

function SleepRow({ sleep, selected, onPress }: { sleep: Sleep; selected: boolean; onPress: () => void }) {
  const [w, setW] = useState(0);
  const s = summarizeSleep(sleep);
  const segs = trackerSegments(sleep).map((g) => ({ ...g, id: sleep.id }));
  const a = segs.length ? Math.min(...segs.map((g) => g.start)) : 0;
  const b = segs.length ? Math.max(...segs.map((g) => g.end)) : 1440;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      testID="sleep-row"
      style={({ pressed, hovered }: PressState) => [styles.row, styles.sleepRow, (pressed || hovered) && { backgroundColor: colors.surfaceHover }, selected && styles.rowSelected]}
    >
      <AppIcon name="sommeil" size={34} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={styles.rowTop}>
          <Title size={17} style={{ flex: 1 }} numberOfLines={1}>
            {sleepTitle(sleep)}
          </Title>
          <Txt muted size={14}>
            {s.sleep !== null ? formatDuration(s.sleep) : 'Heures à compléter'}
          </Txt>
        </View>
        {segs.length > 0 && (
          <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: 14 }}>
            {w > 0 && <SleepRibbonRow width={w} height={14} segs={segs} id={`row-${sleep.id}`} range={[a - 4, b + 4]} />}
          </View>
        )}
      </View>
    </Pressable>
  );
}

function DreamRow({ dream, selected, onPress }: { dream: Dream; selected: boolean; onPress: () => void }) {
  const d = normalizeDream(dream);
  const excerpt = d.text.trim().split('\n')[0];
  const moodImg = d.mood !== null || d.moodEmoji ? moodImageFor(d.moodEmoji, d.mood) : undefined;
  const audio = d.media.filter((m) => m.type === 'audio').length;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      testID="dream-row"
      style={({ pressed, hovered }: PressState) => [styles.row, styles.dreamRow, (pressed || hovered) && { backgroundColor: colors.surfaceHover }, selected && styles.rowSelected]}
    >
      <AppIcon name={d.kind === 'quick' ? 'lune-contour' : 'lune-crepuscule'} size={34} style={{ marginTop: 2 }} />
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
          {/* Résumé : couleurs (en tache), humeur, lucidité, clarté — dans cet ordre. */}
          {d.colors.length > 0 && <ColorStain colors={d.colors} height={24} seed={d.id.charCodeAt(d.id.length - 1)} />}
          {moodImg && <AppIcon name={moodImg as AppIconName} size={22} />}
          {d.lucidity !== null && <AppIcon name={`lucidite-b-${d.lucidity}` as AppIconName} size={22} />}
          {d.clarity !== null && d.clarity >= 1 && d.clarity <= 5 && <AppIcon name={`clarte-${d.clarity}` as AppIconName} size={22} />}
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
            {d.placeIds.length > 0 && <Meta image="compte-lieux" text={String(d.placeIds.length)} label="lieux" />}
            {d.peopleIds.length > 0 && <Meta image="compte-personnes" text={String(d.peopleIds.length)} label="personnes" />}
            {audio > 0 && <Meta image="compte-notes" text={String(audio)} label="notes vocales" />}
          </View>
        )}
      </View>
    </Pressable>
  );
}

function Meta(props: { image: AppIconName; text: string; label: string }) {
  return (
    <View style={styles.metaItem} accessibilityLabel={`${props.text} ${props.label}`}>
      <AppIcon name={props.image} size={16} />
      <Txt faint size={13}>
        {props.text}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  top: { padding: 12, gap: 10 },
  topPhone: { paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  searchField: { flex: 1, borderWidth: 0, backgroundColor: 'transparent' },
  filters: { flexDirection: 'row', gap: 6 },
  filter: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingLeft: 8, paddingRight: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  filterOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  list: { paddingHorizontal: 12, gap: 8 },
  dayHeader: { color: colors.ochre, fontFamily: fonts.display, fontSize: 17, marginTop: 10, marginBottom: 2, marginLeft: 4 },
  row: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.borderSoft, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8 },
  rowSelected: { backgroundColor: colors.surfaceActive, borderColor: colors.accent },
  sleepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dreamRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quick: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 6 },
  meta: { flexDirection: 'row', gap: 12, marginTop: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24, gap: 8 },
});
