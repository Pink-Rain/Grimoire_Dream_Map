import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { appStore, useStoreVersion } from '../data/appStore';
import { formatDuration, shiftDate, summarizeSleep, trackerSegments, type TrackerSegment } from '../data/sleep';
import { localDateString } from '../data/records';
import type { Sleep } from '../data/types';
import { AppIcon } from './AppIcon';
import { Button, IconButton, Segmented, Title, Txt } from './components';
import { colors, fonts, SLEEP_QUALITY, WAKE_ENERGY } from './theme';

const ROW_H = 30;
const HOURS = [12, 15, 18, 21, 0, 3, 6, 9, 12];

function weekdayLabel(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 12);
  return dt.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }).replace('.', '');
}

function rangeLabel(from: string, to: string) {
  const f = (s: string, month: boolean) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d, 12).toLocaleDateString('fr-FR', month ? { day: 'numeric', month: 'long' } : { day: 'numeric' });
  };
  return `Du ${f(from, from.slice(5, 7) !== to.slice(5, 7))} au ${f(to, true)}`;
}

/**
 * Tracker de sommeil façon bullet journal : une ligne par jour (de midi à midi), des barres pour le sommeil,
 * les réveils en cuivre, et les rêves de la nuit en petites lunes au bout de la ligne.
 */
export function SleepTracker(props: { phone: boolean; bottomInset: number; onOpenSleep: (id: string) => void; onNewSleep: (date?: string) => void }) {
  const version = useStoreVersion();
  const [days, setDays] = useState<'14' | '30'>('14');
  const [end, setEnd] = useState(localDateString());
  const [width, setWidth] = useState(0);
  const scroll = useRef<{ scrollToEnd(o?: { animated?: boolean }): void } | null>(null);
  const n = Number(days);
  const start = shiftDate(end, -(n - 1));

  const data = useMemo(() => {
    const sleeps = appStore.list('sleeps');
    const dreams = appStore.list('dreams');
    const rows = new Map<string, { segs: (TrackerSegment & { id: string })[]; sleeps: Sleep[] }>();
    for (let i = 0; i < n; i++) rows.set(shiftDate(start, i), { segs: [], sleeps: [] });
    for (const s of sleeps) {
      const segs = trackerSegments(s);
      if (!segs.length) continue;
      const r = rows.get(segs[0].row);
      if (!r) continue;
      r.sleeps.push(s);
      for (const g of segs) r.segs.push({ ...g, id: s.id });
    }
    const dreamsBySleep = new Map<string, number>();
    for (const d of dreams) if (d.sleepId) dreamsBySleep.set(d.sleepId, (dreamsBySleep.get(d.sleepId) ?? 0) + 1);
    // Moyennes sur la période (nuits seulement).
    const nights = [...rows.values()].flatMap((r) => r.sleeps).filter((s) => !summarizeSleep(s).isNap);
    const durations = nights.map((s) => summarizeSleep(s).sleep).filter((v): v is number => v !== null);
    const avg = (vals: (number | null | undefined)[]) => {
      const v = vals.filter((x): x is number => typeof x === 'number');
      return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
    };
    return {
      rows: [...rows.entries()],
      dreamsBySleep,
      avgSleep: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
      avgQuality: avg(nights.map((s) => s.quality)),
      avgEnergy: avg(nights.map((s) => s.energy)),
      nightCount: nights.length,
      dreamCount: nights.reduce((sum, s) => sum + (dreamsBySleep.get(s.id) ?? 0), 0),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, start, n]);

  const labelW = props.phone ? 52 : 70;
  const tailW = props.phone ? 46 : 92;
  const gridW = Math.max(120, width - labelW - tailW);
  const x = (min: number) => (min / 1440) * gridW;
  const hours = props.phone ? [12, 18, 0, 6, 12] : HOURS;
  const today = localDateString();
  const q = SLEEP_QUALITY.find((v) => v.value === data.avgQuality);
  const e = WAKE_ENERGY.find((v) => v.value === data.avgEnergy);

  return (
    <View style={styles.fill}>
      <View style={[styles.head, props.phone && { paddingHorizontal: 12 }]}>
        <View style={styles.headRow}>
          <IconButton image="chevron-gauche" size={16} label="Période précédente" onPress={() => setEnd(shiftDate(end, -n))} />
          <Title size={props.phone ? 17 : 20} style={{ flex: 1, textAlign: 'center' }} testID="tracker-range">
            {rangeLabel(start, end)}
          </Title>
          <IconButton image="chevron-droit" size={16} label="Période suivante" onPress={() => setEnd(shiftDate(end, n))} />
        </View>
        <View style={styles.headRow}>
          <View style={{ width: 230 }}>
            <Segmented
              value={days}
              onChange={setDays}
              options={[
                { value: '14', label: '2 semaines' },
                { value: '30', label: '1 mois' },
              ]}
              testID="tracker-days"
            />
          </View>
          <View style={{ flex: 1 }} />
          {end !== today && <Button small variant="ghost" label="Aujourd’hui" onPress={() => setEnd(today)} />}
          {!props.phone && <Button small label="Nouveau sommeil" image="sommeil" onPress={() => props.onNewSleep()} testID="tracker-new" />}
        </View>
        <View style={styles.stats}>
          <Stat label="Sommeil moyen" value={formatDuration(data.avgSleep)} testID="tracker-avg" />
          <Stat label="Qualité" value={q ? `${q.emoji} ${q.label}` : '—'} />
          <Stat label="Énergie au réveil" value={e ? `${e.emoji} ${e.label}` : '—'} />
          <Stat label="Rêves notés" value={`${data.dreamCount} / ${data.nightCount} nuit${data.nightCount > 1 ? 's' : ''}`} />
        </View>
      </View>

      <View style={[styles.sheet, props.phone && { marginHorizontal: 8 }]} onLayout={(ev) => setWidth(ev.nativeEvent.layout.width - 24)}>
        {width > 0 && (
          <>
            <View style={[styles.hourRow, { marginLeft: labelW, width: gridW }]}>
              {hours.map((h, i) => (
                <Text key={i} style={[styles.hour, { left: x(((h - 12 + 24) % 24) * 60 + (i === hours.length - 1 ? 1440 : 0)) - 14 }]}>
                  {h}h
                </Text>
              ))}
            </View>
            <ScrollView ref={scroll as never} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 + props.bottomInset }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
              {data.rows.map(([date, r]) => {
                const isToday = date === today;
                const moons = r.sleeps.reduce((sum, s) => sum + (data.dreamsBySleep.get(s.id) ?? 0), 0);
                const night = r.sleeps.find((s) => !summarizeSleep(s).isNap) ?? r.sleeps[0];
                const total = r.sleeps.reduce((sum, s) => sum + (summarizeSleep(s).sleep ?? 0), 0);
                return (
                  <View key={date} style={styles.row} testID="tracker-row">
                    <Text style={[styles.dayLabel, { width: labelW }, isToday && { color: colors.ochre }]}>{weekdayLabel(date)}</Text>
                    <Pressable
                      onPress={() => (night ? props.onOpenSleep(night.id) : props.onNewSleep(date))}
                      accessibilityRole="button"
                      accessibilityLabel={night ? `Ouvrir le sommeil du ${weekdayLabel(date)}` : `Noter le sommeil du ${weekdayLabel(date)}`}
                      style={{ width: gridW, height: ROW_H }}
                    >
                      {/* Grille de points, comme une page de bullet journal */}
                      {Array.from({ length: 25 }, (_, h) => (
                        <View key={h} style={[styles.dot, { left: x(h * 60) - 1.5 }, h % 3 === 0 && styles.dotStrong]} />
                      ))}
                      {r.segs.map((g, i) => (
                        <Pressable
                          key={i}
                          onPress={() => props.onOpenSleep(g.id)}
                          accessibilityRole="button"
                          accessibilityLabel="Ouvrir ce sommeil"
                          style={[styles.seg, styles[g.kind], { left: x(g.start), width: Math.max(2, x(g.end) - x(g.start)) }]}
                          testID={`seg-${g.kind}`}
                        />
                      ))}
                    </Pressable>
                    <View style={[styles.tail, { width: tailW }]}>
                      {moons > 0 && (
                        <View style={styles.moons}>
                          <AppIcon name="lune-crepuscule" size={16} />
                          {moons > 1 && <Text style={styles.moonCount}>{moons}</Text>}
                        </View>
                      )}
                      {!props.phone && total > 0 && <Text style={styles.total}>{formatDuration(total)}</Text>}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <View style={styles.legend}>
              <Legend style={styles.sleep} label="Sommeil" />
              <Legend style={styles.bed} label="Au lit éveillé" />
              <Legend style={styles.awake} label="Réveil" />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <AppIcon name="lune-crepuscule" size={14} />
                <Txt faint size={13}>
                  Rêves
                </Txt>
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function Stat(props: { label: string; value: string; testID?: string }) {
  return (
    <View style={styles.stat}>
      <Txt faint size={12}>
        {props.label}
      </Txt>
      <Text style={styles.statValue} numberOfLines={1} testID={props.testID}>
        {props.value}
      </Text>
    </View>
  );
}

function Legend(props: { style: object; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={[{ width: 18, borderRadius: 4 }, props.style, { position: 'relative', top: 0 }]} />
      <Txt faint size={13}>
        {props.label}
      </Txt>
    </View>
  );
}

/** Page Statistiques : prête, en attente de contenu. */
export function StatsScreen() {
  return (
    <View style={[styles.fill, { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 }]} testID="stats-screen">
      <AppIcon name="logo-grand" size={110} />
      <Title size={26}>Statistiques</Title>
      <Txt muted style={{ textAlign: 'center', maxWidth: 420 }}>
        Bientôt ici : tes nuits, tes rêves, tes lieux et tes émotions en chiffres et en graphiques.
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  head: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { flexGrow: 1, minWidth: 130, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft },
  statValue: { color: colors.text, fontFamily: fonts.display, fontSize: 18 },
  sheet: {
    flex: 1,
    margin: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#15122b',
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  hourRow: { height: 20, marginBottom: 4 },
  hour: { position: 'absolute', width: 28, textAlign: 'center', color: colors.faint, fontFamily: fonts.body, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', height: ROW_H },
  dayLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
  dot: { position: 'absolute', top: ROW_H / 2 - 1.5, width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#3a335f' },
  dotStrong: { backgroundColor: '#5c5088' },
  seg: { position: 'absolute' },
  sleep: { top: 7, height: 16, borderRadius: 8, backgroundColor: '#6c55c4', borderWidth: 1, borderColor: '#a993ee' },
  bed: { top: 12, height: 6, borderRadius: 3, backgroundColor: '#8c7a5c' },
  up: { top: 12, height: 6, borderRadius: 3, backgroundColor: '#8c7a5c' },
  awake: { top: 9, height: 12, borderRadius: 3, backgroundColor: colors.accent },
  tail: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, paddingLeft: 6 },
  moons: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  moonCount: { color: colors.ochre, fontFamily: fonts.bodySemi, fontSize: 12 },
  total: { color: colors.faint, fontFamily: fonts.body, fontSize: 12, minWidth: 44, textAlign: 'right' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderSoft },
});
