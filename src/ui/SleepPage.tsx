/**
 * Page de lecture d'un sommeil : le ruban de la nuit en grand, les heures (à toucher pour les changer avec la
 * petite horloge), le ressenti, l'humeur au réveil, la veille, et les rêves de cette nuit.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { appStore, useStoreVersion } from '../data/appStore';
import { formatDuration, sleepEndDate, sleepTitle, summarizeSleep, trackerSegments } from '../data/sleep';
import { confirmAsync } from '../platform/dialogs';
import { AppIcon, type AppIconName } from './AppIcon';
import { Button, Txt, type PressState } from './components';
import { formatLongDate } from './dates';
import { DetailSheet } from './DetailSheet';
import { AddDetailButton, Book, Ornament, PageToolbar, SectionLabel, TagLine, Tile } from './reading';
import { SleepRibbonRow } from './SleepRibbon';
import { isSleepFieldEmpty, SLEEP_FIELD_TITLES, SLEEP_FIELDS, SleepFieldEditor, type SleepEditable, type SleepField } from './sleepFields';
import { colors, fonts, MOOD_GRID, moodImageFor, SLEEP_QUALITY, WAKE_ENERGY } from './theme';
import { TimePicker } from './TimePicker';

type HourKey = 'bedTime' | 'asleepTime' | 'wakeTime' | 'upTime';
const HOURS: { key: HourKey; label: string; image: AppIconName }[] = [
  { key: 'bedTime', label: 'Coucher', image: 'coucher' },
  { key: 'asleepTime', label: 'Endormissement', image: 'endormissement' },
  { key: 'wakeTime', label: 'Réveil', image: 'reveil' },
  { key: 'upTime', label: 'Lever', image: 'lever' },
];
const hm = (t: string | null | undefined) => (t ? t.replace(':', ' h ').replace(/^0(\d)/, '$1') : '—');

export function SleepPage(props: {
  sleepId: string;
  wide: boolean;
  phone: boolean;
  onEdit: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onOpenDream?: (id: string) => void;
  onNewDream?: (sleepId: string, date: string) => void;
  onDeleted: () => void;
  bottomInset: number;
}) {
  useStoreVersion();
  const [sheet, setSheet] = useState<SleepField | 'add' | null>(null);
  const [clock, setClock] = useState<HourKey | null>(null);
  const [ribbonW, setRibbonW] = useState(0);
  const s = appStore.get('sleeps', props.sleepId);
  if (!s) return null;
  const commit = (f: SleepEditable) => appStore.save('sleeps', props.sleepId, f);
  const sum = summarizeSleep(s);
  const segs = trackerSegments(s).map((g) => ({ ...g, id: s.id }));
  const a = segs.length ? Math.min(...segs.map((g) => g.start)) : 0;
  const b = segs.length ? Math.max(...segs.map((g) => g.end)) : 1440;
  const pad = Math.max(10, (b - a) * 0.03);
  const dreams = appStore.list('dreams').filter((d) => d.sleepId === props.sleepId);
  const missing = SLEEP_FIELDS.filter((f) => isSleepFieldEmpty(f, s));
  const quality = SLEEP_QUALITY.find((q) => q.value === s.quality);
  const energy = WAKE_ENERGY.find((q) => q.value === s.energy);
  const wakeImg = s.wakeMood != null || s.wakeMoodEmoji ? moodImageFor(s.wakeMoodEmoji ?? null, s.wakeMood ?? null) : undefined;
  const wakeLevel = MOOD_GRID.find((g) => g.level === s.wakeMood);

  async function onDelete() {
    if (!(await confirmAsync('Supprimer ce sommeil ?', 'Ses heures seront effacées.', 'Supprimer'))) return;
    appStore.remove('sleeps', props.sleepId);
    props.onDeleted();
  }

  const left = (
    <>
      <View style={styles.meta}>
        <AppIcon name="sommeil" size={28} />
        <Txt muted size={15}>
          Coucher le {formatLongDate(s.date)}
        </Txt>
      </View>
      <Text style={[styles.title, props.phone && { fontSize: 30 }]}>{sleepTitle(s)}</Text>
      <Ornament />
      {segs.length > 0 && (
        <View style={{ gap: 6 }} onLayout={(e) => setRibbonW(e.nativeEvent.layout.width)} testID="page-ribbon">
          {ribbonW > 0 && <SleepRibbonRow width={ribbonW} height={30} segs={segs} id={`page-${s.id}`} range={[a - pad, b + pad]} band={22} />}
          <View style={styles.ribbonLabels}>
            <Txt faint size={13}>{hm(s.bedTime ?? s.asleepTime)}</Txt>
            {sum.interruptions.length > 0 && (
              <Txt faint size={13}>
                {sum.interruptions.length} réveil{sum.interruptions.length > 1 ? 's' : ''} · {formatDuration(sum.awake)}
              </Txt>
            )}
            <Txt faint size={13}>{hm(s.upTime ?? s.wakeTime)}</Txt>
          </View>
        </View>
      )}
      <View style={styles.hours}>
        {HOURS.map((h) => (
          <Pressable
            key={h.key}
            onPress={() => setClock(h.key)}
            accessibilityRole="button"
            accessibilityLabel={`${h.label} : ${hm(s[h.key])}`}
            testID={`page-${h.key}`}
            style={({ hovered }: PressState) => [styles.hour, hovered && { backgroundColor: colors.surfaceHover }]}
          >
            <AppIcon name={h.image} size={32} />
            <View>
              <Txt faint size={13}>
                {h.label}
              </Txt>
              <Text style={styles.hourValue}>{hm(s[h.key])}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      <View style={styles.stats}>
        <Stat label="Sommeil" value={formatDuration(sum.sleep)} />
        <Stat label="Au lit" value={formatDuration(sum.inBed)} />
        <Stat label="Pour s’endormir" value={formatDuration(sum.fallAsleep)} />
      </View>
    </>
  );

  const right = (
    <>
      {(quality || energy || wakeImg) && (
        <View style={styles.tiles}>
          {quality && <Tile image={quality.image as AppIconName} label={quality.label} caption="Qualité" onPress={() => setSheet('feel')} testID="tile-quality" />}
          {energy && <Tile image={energy.image as AppIconName} label={energy.label} caption="Énergie" onPress={() => setSheet('feel')} testID="tile-energy" />}
          {wakeImg && <Tile image={wakeImg as AppIconName} label={wakeLevel?.label ?? '—'} caption="Humeur au réveil" onPress={() => setSheet('wakeMood')} testID="tile-wake" />}
        </View>
      )}
      {(s.wakeEmotions ?? []).length > 0 && (
        <View style={{ gap: 8 }}>
          <SectionLabel>Émotions au réveil</SectionLabel>
          <TagLine items={(s.wakeEmotions ?? []).map((label) => ({ label, tone: 'filled' as const }))} onPress={() => setSheet('wakeMood')} />
        </View>
      )}
      {((s.factors ?? []).length > 0 || (s.sleepPlaces ?? []).length > 0) && (
        <View style={{ gap: 8 }}>
          <SectionLabel>La veille et le lieu</SectionLabel>
          <TagLine
            items={[...(s.factors ?? []).map((label) => ({ label })), ...(s.sleepPlaces ?? []).map((label) => ({ label, tone: 'warm' as const }))]}
            onPress={() => setSheet('context')}
          />
        </View>
      )}
      <View style={{ gap: 8 }}>
        <SectionLabel>Rêves de cette nuit</SectionLabel>
        {dreams.map((d) => (
          <Pressable
            key={d.id}
            onPress={() => props.onOpenDream?.(d.id)}
            accessibilityRole="button"
            style={({ hovered }: PressState) => [styles.dream, hovered && { backgroundColor: colors.surfaceHover }]}
            testID="sleep-dream"
          >
            <AppIcon name={d.kind === 'quick' ? 'lune-contour' : 'lune-crepuscule'} size={28} />
            <Text style={styles.dreamTitle} numberOfLines={1}>
              {d.title.trim() || 'Sans titre'}
            </Text>
            <AppIcon name="voir-plus" size={16} />
          </Pressable>
        ))}
        <Button small label="Ajouter un rêve de cette nuit" image="nouveau-reve-b" onPress={() => props.onNewDream?.(s.id, sleepEndDate(s))} testID="sleep-new-dream" />
      </View>
      {missing.length > 0 && <AddDetailButton onPress={() => setSheet('add')} />}
    </>
  );

  return (
    <View style={{ flex: 1 }}>
      <Book
        wide={props.wide}
        bottomInset={props.bottomInset}
        toolbar={<PageToolbar phone={props.phone} onPrev={props.onPrev} onNext={props.onNext} onEdit={props.onEdit} onDelete={onDelete} prevLabel="Nuit précédente" nextLabel="Nuit suivante" />}
        left={left}
        right={right}
      />
      <DetailSheet visible={sheet === 'add'} phone={props.phone} title="Ajouter un détail" onClose={() => setSheet(null)}>
        <View style={styles.wrap}>
          {missing.map((f) => (
            <Button key={f} label={SLEEP_FIELD_TITLES[f]} image="ajouter-petit" onPress={() => setSheet(f)} testID={`add-${f}`} />
          ))}
          <Button label="Réveils pendant la nuit" image="ajouter-petit" onPress={() => (setSheet(null), props.onEdit())} />
        </View>
      </DetailSheet>
      {sheet && sheet !== 'add' && (
        <DetailSheet visible phone={props.phone} title={SLEEP_FIELD_TITLES[sheet]} onClose={() => setSheet(null)}>
          <SleepFieldEditor field={sheet} draft={s} commit={commit} />
        </DetailSheet>
      )}
      <TimePicker
        visible={!!clock}
        title={HOURS.find((h) => h.key === clock)?.label ?? ''}
        value={clock ? s[clock] ?? null : null}
        onClose={() => setClock(null)}
        onChange={(v) => clock && commit({ [clock]: v })}
      />
    </View>
  );
}

function Stat(props: { label: string; value: string }) {
  return (
    <View style={{ gap: 0 }}>
      <Txt faint size={13}>
        {props.label}
      </Txt>
      <Text style={styles.statValue}>{props.value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 38, lineHeight: 44 },
  ribbonLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  hours: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  hour: { flexGrow: 1, flexBasis: 160, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, backgroundColor: colors.surface },
  hourValue: { color: colors.text, fontFamily: fonts.display, fontSize: 22 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  statValue: { color: colors.text, fontFamily: fonts.display, fontSize: 22 },
  tiles: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dream: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface },
  dreamTitle: { flex: 1, color: colors.text, fontFamily: fonts.display, fontSize: 18 },
});
