/** Petit calendrier du journal (mois entier) et bande de la semaine (téléphone). */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { localDateString } from '../data/records';
import { AppIcon } from './AppIcon';
import { IconButton, type PressState } from './components';
import { addDays, parseLocalDate } from './dates';
import { colors, fonts } from './theme';

type Marks = Map<string, { dream: boolean; sleep: boolean }>;
const WD = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const pad = (n: number) => String(n).padStart(2, '0');

export function monthOf(day: string) {
  return day.slice(0, 7);
}
function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1, 12);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function monthLabel(month: string) {
  const [y, m] = month.split('-').map(Number);
  const t = new Date(y, m - 1, 1, 12).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}
/** Lundi de la semaine de ce jour. */
function monday(day: string) {
  const wd = (parseLocalDate(day).getDay() + 6) % 7;
  return addDays(day, -wd);
}

function DayCell(props: { day: string; label: string; wd?: string; selected: boolean; marks?: { dream: boolean; sleep: boolean }; onPick: (d: string) => void; tall?: boolean }) {
  const today = props.day === localDateString();
  return (
    <Pressable
      onPress={() => props.onPick(props.day)}
      accessibilityRole="button"
      accessibilityLabel={props.day}
      testID={`cal-${props.day}`}
      style={({ hovered }: PressState) => [styles.cell, props.tall && styles.cellTall, props.selected && styles.cellOn, !props.selected && today && styles.cellToday, hovered && !props.selected && { backgroundColor: colors.surfaceHover }]}
    >
      {props.wd && <Text style={[styles.wd, props.selected && { color: colors.accentText }]}>{props.wd}</Text>}
      <Text style={[styles.num, props.selected && { color: colors.accentText, fontFamily: fonts.bodySemi }, !props.selected && today && { color: colors.ochre }]}>{props.label}</Text>
      <View style={styles.marks}>
        {props.marks?.dream && <AppIcon name="marque-reve" size={11} />}
        {props.marks?.sleep && <AppIcon name="marque-sommeil" size={11} />}
      </View>
    </Pressable>
  );
}

export function MonthCalendar(props: { month: string; selected: string | null; marks: Marks; onPick: (day: string) => void; onMonth: (month: string) => void; onToday: () => void; onCollapse?: () => void }) {
  const [y, m] = props.month.split('-').map(Number);
  const first = `${props.month}-01`;
  const offset = (parseLocalDate(first).getDay() + 6) % 7;
  const days = new Date(y, m, 0).getDate();
  const cells: (string | null)[] = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => `${props.month}-${pad(i + 1)}`)];
  while (cells.length % 7) cells.push(null);
  return (
    <View style={styles.card} testID="calendar">
      <View style={styles.head}>
        <IconButton image="chevron-gauche" size={16} label="Mois précédent" onPress={() => props.onMonth(shiftMonth(props.month, -1))} testID="cal-prev" />
        <Text style={styles.month}>{monthLabel(props.month)}</Text>
        <IconButton image="chevron-droit" size={16} label="Mois suivant" onPress={() => props.onMonth(shiftMonth(props.month, 1))} testID="cal-next" />
        <IconButton image="aujourdhui" size={20} label="Aujourd’hui" onPress={props.onToday} testID="cal-today" />
        {props.onCollapse && <IconButton image="replier" size={20} label="Replier le calendrier" onPress={props.onCollapse} testID="cal-collapse" />}
      </View>
      <View style={styles.grid}>
        {WD.map((w, i) => (
          <Text key={i} style={[styles.wd, styles.gridCell]}>
            {w}
          </Text>
        ))}
        {cells.map((d, i) =>
          d ? (
            <View key={i} style={styles.gridCell}>
              <DayCell day={d} label={String(Number(d.slice(8)))} selected={d === props.selected} marks={props.marks.get(d)} onPick={props.onPick} />
            </View>
          ) : (
            <View key={i} style={styles.gridCell} />
          ),
        )}
      </View>
    </View>
  );
}

export function WeekStrip(props: { day: string; selected: string | null; marks: Marks; onPick: (day: string) => void; onExpand: () => void; onToday: () => void }) {
  const start = monday(props.day);
  const week = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <View style={styles.strip} testID="week-strip">
      <View style={styles.head}>
        <IconButton image="chevron-gauche" size={16} label="Semaine précédente" onPress={() => props.onPick(addDays(start, -7))} />
        <Text style={styles.month}>{monthLabel(monthOf(props.day))}</Text>
        <IconButton image="chevron-droit" size={16} label="Semaine suivante" onPress={() => props.onPick(addDays(start, 7))} />
        <IconButton image="aujourdhui" size={20} label="Aujourd’hui" onPress={props.onToday} />
        <IconButton image="deplier" size={20} label="Voir le mois entier" onPress={props.onExpand} testID="cal-expand" />
      </View>
      <View style={styles.grid}>
        {week.map((d, i) => (
          <View key={d} style={styles.gridCell}>
            <DayCell day={d} wd={WD[i]} label={String(Number(d.slice(8)))} selected={d === props.selected} marks={props.marks.get(d)} onPick={props.onPick} tall />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 10, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, gap: 4 },
  strip: { gap: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  month: { flex: 1, textAlign: 'center', color: colors.text, fontFamily: fonts.display, fontSize: 19 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridCell: { width: `${100 / 7}%`, padding: 1, alignItems: 'stretch', textAlign: 'center' },
  wd: { color: colors.faint, fontFamily: fonts.body, fontSize: 12, textAlign: 'center' },
  cell: { height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  cellTall: { height: 54 },
  cellOn: { backgroundColor: colors.accent },
  cellToday: { borderWidth: 1, borderColor: colors.border },
  num: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 16 },
  marks: { flexDirection: 'row', gap: 1, height: 12, alignItems: 'center' },
});
