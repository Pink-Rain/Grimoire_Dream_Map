import { randomUUID } from 'expo-crypto';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { appStore } from '../data/appStore';
import { completeInterruption, defaultSleepDate, formatDuration, sleepEndDate, summarizeSleep, type SleepSummary } from '../data/sleep';
import { useStoreVersion } from '../data/appStore';
import type { Sleep } from '../data/types';
import { confirmAsync } from '../platform/dialogs';
import { AppIcon, type AppIconName } from './AppIcon';
import { Button, Chip, IconButton, Section, Txt } from './components';
import { EmojiScale, MoodPicker, WordPicker } from './widgets';
import { TimePicker } from './TimePicker';
import type { PressState } from './components';
import { addDays, formatLongDate } from './dates';
import { colors, EMOTIONS, fonts, MOOD_GRID, optionFor, SLEEP_FACTORS, SLEEP_PLACES, SLEEP_QUALITY, WAKE_ENERGY } from './theme';

type Draft = Required<
  Pick<Sleep, 'date' | 'bedTime' | 'asleepTime' | 'wakeTime' | 'upTime' | 'interruptions' | 'quality' | 'energy' | 'factors' | 'sleepPlaces' | 'wakeMood' | 'wakeMoodEmoji' | 'wakeEmotions'>
>;

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Champ d'heure : on le touche pour ouvrir le mini popup horloge. */
function TimeField(props: { label: string; emoji: string; image?: AppIconName; value: string | null; onChange: (v: string | null) => void; testID: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.timeRow, props.compact && { gap: 6 }]}>
      {!props.compact && (props.image ? <AppIcon name={props.image} size={32} /> : <Text style={styles.timeEmoji}>{props.emoji}</Text>)}
      {!props.compact && (
        <Txt style={{ flex: 1 }} weight="semi">
          {props.label}
        </Txt>
      )}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${props.label} : ${props.value ?? 'non renseigné'}`}
        testID={props.testID}
        style={({ hovered }: PressState) => [styles.timeInput, hovered && { borderColor: colors.accent }]}
      >
        <Text style={[styles.timeText, !props.value && { color: colors.faint }]}>{props.value ?? '--:--'}</Text>
      </Pressable>
      {!props.compact && <Button small variant="ghost" label="Maintenant" onPress={() => props.onChange(nowHHMM())} testID={`${props.testID}-now`} />}
      <TimePicker visible={open} title={props.label} value={props.value} onClose={() => setOpen(false)} onChange={props.onChange} />
    </View>
  );
}

/** Frise de la nuit : endormissement, sommeil, réveils, lever. */
function Timeline({ s }: { s: SleepSummary }) {
  const start = s.bed ?? s.asleep;
  const end = s.up ?? s.wake;
  if (start === null || end === null || end <= start) return null;
  const span = end - start;
  const pct = (a: number, b: number) => ({ left: `${((a - start) / span) * 100}%` as const, width: `${((b - a) / span) * 100}%` as const });
  const segs: { a: number; b: number; color: string }[] = [];
  if (s.bed !== null && s.asleep !== null) segs.push({ a: s.bed, b: s.asleep, color: colors.border });
  if (s.asleep !== null && s.wake !== null) segs.push({ a: s.asleep, b: s.wake, color: '#5b4bb0' });
  for (const i of s.interruptions) segs.push({ a: i.from, b: i.to, color: colors.accent });
  if (s.wake !== null && s.up !== null) segs.push({ a: s.wake, b: s.up, color: colors.ochre });
  const hh = (m: number) => `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return (
    <View style={{ gap: 6 }} testID="sleep-timeline">
      <View style={styles.track}>
        {segs.map((g, i) => (
          <View key={i} style={[styles.seg, pct(g.a, g.b), { backgroundColor: g.color }]} />
        ))}
      </View>
      <View style={styles.trackLabels}>
        <Txt faint size={13}>{hh(start)}</Txt>
        <Txt faint size={13}>{hh(end)}</Txt>
      </View>
      <View style={styles.legend}>
        <Legend color={colors.border} label="Endormissement" />
        <Legend color="#5b4bb0" label="Sommeil" />
        <Legend color={colors.accent} label="Réveils" />
        <Legend color={colors.ochre} label="Lever" />
      </View>
    </View>
  );
}

function Legend(props: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: props.color }} />
      <Txt faint size={13}>
        {props.label}
      </Txt>
    </View>
  );
}

function Stat(props: { label: string; value: string; testID?: string }) {
  return (
    <View style={styles.stat}>
      <Txt faint size={13}>
        {props.label}
      </Txt>
      <Text style={styles.statValue} testID={props.testID}>
        {props.value}
      </Text>
    </View>
  );
}

/** Sommeil (nuit ou sieste) : troisième type d'entrée, indépendant des rêves. Enregistrement automatique. */
export function SleepEditor(props: {
  sleepId: string;
  initialDate?: string;
  onDeleted: () => void;
  onOpenDream?: (id: string) => void;
  onNewDream?: (sleepId: string, date: string) => void;
  bottomInset: number;
}) {
  useStoreVersion();
  const existing = appStore.get('sleeps', props.sleepId);
  const [d, setD] = useState<Draft>(() => ({
    date: existing?.date ?? props.initialDate ?? defaultSleepDate(),
    bedTime: existing?.bedTime ?? null,
    asleepTime: existing?.asleepTime ?? null,
    wakeTime: existing?.wakeTime ?? null,
    upTime: existing?.upTime ?? null,
    interruptions: existing?.interruptions ?? [],
    quality: existing?.quality ?? null,
    energy: existing?.energy ?? null,
    factors: existing?.factors ?? [],
    sleepPlaces: existing?.sleepPlaces ?? [],
    wakeMood: existing?.wakeMood ?? null,
    wakeMoodEmoji: existing?.wakeMoodEmoji ?? null,
    wakeEmotions: existing?.wakeEmotions ?? [],
  }));
  const exists = useRef(!!existing);

  function commit(fields: Partial<Draft>) {
    const next = { ...d, ...fields };
    setD(next);
    const hasContent = !!(
      next.bedTime ||
      next.asleepTime ||
      next.wakeTime ||
      next.upTime ||
      next.interruptions.length ||
      next.quality ||
      next.energy ||
      next.factors.length ||
      next.sleepPlaces.length ||
      next.wakeMood !== null ||
      next.wakeEmotions.length
    );
    if (!exists.current && !hasContent) return;
    appStore.save('sleeps', props.sleepId, next);
    exists.current = true;
  }

  async function onDelete() {
    if (!exists.current) return props.onDeleted();
    if (!(await confirmAsync('Supprimer ce sommeil ?', 'Ses heures seront effacées.', 'Supprimer'))) return;
    appStore.remove('sleeps', props.sleepId);
    props.onDeleted();
  }

  const s = summarizeSleep(d);
  const endDate = sleepEndDate(d);
  const dreams = appStore.list('dreams').filter((x) => x.sleepId === props.sleepId);
  const loose = appStore.list('dreams').filter((x) => !x.sleepId && x.dreamDate === endDate);
  const setInt = (id: string, k: 'from' | 'to', v: string | null) =>
    commit({ interruptions: d.interruptions.map((i) => (i.id === id ? { ...i, ...completeInterruption({ ...i, [k]: v ?? '' }, k) } : i)) });
  const emotionSuggestions = Array.from(
    new Map(
      [
        ...appStore.list('sleeps').flatMap((x) => x.wakeEmotions ?? []),
        ...appStore.list('dreams').flatMap((x) => (x.emotions ?? []).map((v) => optionFor(EMOTIONS, v).label)),
        ...EMOTIONS.map((o) => o.label),
      ].map((w) => [w.toLowerCase(), w]),
    ).values(),
  );
  const suggest = (pick: (x: Sleep) => string[] | undefined, base: string[]) =>
    Array.from(new Map([...appStore.list('sleeps').flatMap((x) => pick(x) ?? []), ...base].map((w) => [w.toLowerCase(), w])).values());

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'web' ? undefined : 'padding'}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 + props.bottomInset }]} keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <View style={styles.badge}>
            <AppIcon name="sommeil" size={20} />
            <Txt size={14} weight="semi" style={{ color: colors.ochre }}>
              {s.isNap ? 'Sieste' : 'Sommeil'}
            </Txt>
          </View>
          <View style={styles.dateRow}>
            <IconButton image="chevron-gauche" size={16} label="Jour précédent" onPress={() => commit({ date: addDays(d.date, -1) })} />
            <Txt muted size={15} style={{ textAlign: 'center', flexShrink: 1 }} testID="sleep-date">
              Coucher le {formatLongDate(d.date)}
            </Txt>
            <IconButton image="chevron-droit" size={16} label="Jour suivant" onPress={() => commit({ date: addDays(d.date, 1) })} />
          </View>
        </View>

        <Section title="Heures">
          <TimeField label="Coucher" emoji="🛏️" image="coucher" value={d.bedTime} onChange={(v) => commit({ bedTime: v })} testID="bed-time" />
          <TimeField label="Endormissement" emoji="😴" image="endormissement" value={d.asleepTime} onChange={(v) => commit({ asleepTime: v })} testID="asleep-time" />
          <TimeField label="Réveil" emoji="⏰" image="reveil" value={d.wakeTime} onChange={(v) => commit({ wakeTime: v })} testID="wake-time" />
          <TimeField label="Lever" emoji="🚶" image="lever" value={d.upTime} onChange={(v) => commit({ upTime: v })} testID="up-time" />
        </Section>

        <Section title="Réveils pendant le sommeil">
          {d.interruptions.length === 0 && (
            <Txt faint size={15}>
              Aucun réveil noté.
            </Txt>
          )}
          {d.interruptions.map((i, n) => (
            <View key={i.id} style={styles.intRow} testID="interruption">
              <Txt weight="semi" style={{ width: 28 }}>
                {n + 1}.
              </Txt>
              <Txt muted>de</Txt>
              <TimeField compact label={`Réveil ${n + 1}, début`} emoji="" value={i.from || null} onChange={(v) => setInt(i.id, 'from', v)} testID={`int-${n}-from`} />
              <Txt muted>à</Txt>
              <TimeField compact label={`Réveil ${n + 1}, fin`} emoji="" value={i.to || null} onChange={(v) => setInt(i.id, 'to', v)} testID={`int-${n}-to`} />
              <View style={{ flex: 1 }} />
              <IconButton icon="close" size={20} color={colors.faint} label={`Retirer le réveil ${n + 1}`} onPress={() => commit({ interruptions: d.interruptions.filter((x) => x.id !== i.id) })} />
            </View>
          ))}
          <Button small label="Ajouter un réveil" icon="add" onPress={() => commit({ interruptions: [...d.interruptions, { id: randomUUID(), from: '', to: '' }] })} testID="add-interruption" />
        </Section>

        <Section title="Ressenti">
          <EmojiScale levels={SLEEP_QUALITY} value={d.quality} onChange={(quality) => commit({ quality })} name="Qualité du sommeil" placeholder="Qualité du sommeil" testID="quality" />
          <EmojiScale levels={WAKE_ENERGY} value={d.energy} onChange={(energy) => commit({ energy })} name="Énergie au réveil" placeholder="Énergie au réveil" testID="energy" />
        </Section>

        <Section title="Humeur au réveil">
          <MoodPicker grid={MOOD_GRID} level={d.wakeMood} emoji={d.wakeMoodEmoji} onChange={(wakeMood, wakeMoodEmoji) => commit({ wakeMood, wakeMoodEmoji })} />
          <WordPicker value={d.wakeEmotions} onChange={(wakeEmotions) => commit({ wakeEmotions })} suggestions={emotionSuggestions} placeholder="Émotions au réveil… puis Entrée" testID="wake-emotion" />
        </Section>

        <Section title="La veille et le lieu">
          <WordPicker value={d.factors} onChange={(factors) => commit({ factors })} suggestions={suggest((x) => x.factors, SLEEP_FACTORS)} placeholder="Facteurs : café, écrans, stress… puis Entrée" testID="factor" />
          <WordPicker value={d.sleepPlaces} onChange={(sleepPlaces) => commit({ sleepPlaces })} suggestions={suggest((x) => x.sleepPlaces, SLEEP_PLACES)} placeholder="Lieu : chez moi, en voyage… puis Entrée" testID="sleep-place" />
        </Section>

        <Section title="Rêves de cette nuit">
          {dreams.map((dr) => (
            <Pressable key={dr.id} onPress={() => props.onOpenDream?.(dr.id)} accessibilityRole="button" style={styles.dreamRow} testID="sleep-dream">
              <AppIcon name={dr.kind === 'quick' ? 'lune-contour' : 'lune-crepuscule'} size={26} />
              <Txt style={{ flex: 1 }} numberOfLines={1}>
                {dr.title.trim() || 'Sans titre'}
              </Txt>
            </Pressable>
          ))}
          {loose.length > 0 && (
            <View style={styles.wrapRow}>
              <Txt faint size={14}>Lier :</Txt>
              {loose.map((dr) => (
                <Chip key={dr.id} label={dr.title.trim() || 'Sans titre'} image="lune-contour" onPress={() => appStore.save('dreams', dr.id, { sleepId: props.sleepId })} testID="link-dream" />
              ))}
            </View>
          )}
          <Button
            small
            label="Ajouter un rêve de cette nuit"
            image="nouveau-reve-b"
            onPress={() => {
              if (!exists.current) commit({});
              appStore.save('sleeps', props.sleepId, d);
              exists.current = true;
              props.onNewDream?.(props.sleepId, sleepEndDate(d));
            }}
            testID="sleep-new-dream"
          />
        </Section>

        <Section title="Bilan">
          <View style={styles.stats}>
            <Stat label="Temps de sommeil" value={formatDuration(s.sleep)} testID="stat-sleep" />
            <Stat label="Endormissement" value={formatDuration(s.fallAsleep)} testID="stat-fall" />
            <Stat label={`Réveils (${s.interruptions.length})`} value={s.interruptions.length ? formatDuration(s.awake) : '—'} testID="stat-awake" />
            <Stat label="Temps pour se lever" value={formatDuration(s.getUp)} testID="stat-getup" />
            <Stat label="Temps total au lit" value={formatDuration(s.inBed)} testID="stat-inbed" />
          </View>
          <Timeline s={s} />
        </Section>

        <View style={styles.footer}>
          <Txt faint size={14}>
            {exists.current ? 'Enregistré automatiquement' : 'Note une heure pour créer ce sommeil'}
          </Txt>
          <Button label="Supprimer" image="supprimer" variant="danger" small onPress={onDelete} testID="delete-sleep" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, maxWidth: 820, width: '100%', alignSelf: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, borderWidth: 1, borderColor: colors.ochre },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 1 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52 },
  timeEmoji: { fontSize: 24, width: 32, textAlign: 'center' },
  timeInput: {
    width: 86,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: { color: colors.text, fontFamily: fonts.display, fontSize: 22 },
  intRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexGrow: 1, minWidth: 140, padding: 12, borderRadius: 12, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.borderSoft, gap: 2 },
  statValue: { color: colors.text, fontFamily: fonts.display, fontSize: 24 },
  track: { height: 18, borderRadius: 9, backgroundColor: colors.bg, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderSoft },
  seg: { position: 'absolute', top: 0, bottom: 0 },
  trackLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  dreamRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  wrapRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 8 },
});
