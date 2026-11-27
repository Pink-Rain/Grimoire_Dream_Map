import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, type PressState } from './components';
import { colors, fonts } from './theme';

const DIAL = 264;
const pad = (n: number) => String(n).padStart(2, '0');

function nowHHMM() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Position d'un chiffre sur le cadran (0 = en haut, sens des aiguilles). */
function pos(index: number, count: number, radius: number) {
  const a = (index / count) * Math.PI * 2 - Math.PI / 2;
  return { left: DIAL / 2 + Math.cos(a) * radius - 20, top: DIAL / 2 + Math.sin(a) * radius - 20 };
}

/**
 * Mini popup horloge : on choisit l'heure sur le cadran (anneau extérieur 1 → 12, intérieur 13 → 0),
 * puis les minutes (de 5 en 5, et ±1 pour ajuster).
 */
export function TimePicker(props: { visible: boolean; title: string; value: string | null; onClose: () => void; onChange: (v: string | null) => void }) {
  const [h, setH] = useState(0);
  const [m, setM] = useState(0);
  const [mode, setMode] = useState<'h' | 'm'>('h');

  useEffect(() => {
    if (!props.visible) return;
    const [hh, mm] = (props.value ?? nowHHMM()).split(':').map(Number);
    setH(hh || 0);
    setM(mm || 0);
    setMode('h');
  }, [props.visible, props.value]);

  const outer = Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i));
  const inner = Array.from({ length: 12 }, (_, i) => (i === 0 ? 0 : i + 12));
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);
  const nudge = (d: number) => {
    const total = (h * 60 + m + d + 1440) % 1440;
    setH(Math.floor(total / 60));
    setM(total % 60);
  };

  const cell = (label: string, selected: boolean, onPress: () => void, p: { left: number; top: number }, small: boolean, testID: string) => (
    <Pressable
      key={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      testID={testID}
      style={({ hovered }: PressState) => [styles.cell, p, selected && styles.cellOn, hovered && !selected && { backgroundColor: colors.surfaceHover }]}
    >
      <Text style={[styles.cellText, small && styles.cellSmall, selected && { color: colors.accentText }]}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
      <Pressable style={styles.backdrop} onPress={props.onClose} accessibilityLabel="Fermer">
        <Pressable style={styles.card} onPress={() => {}} testID="time-picker">
          <Text style={styles.title}>{props.title}</Text>
          <View style={styles.display}>
            <Pressable onPress={() => setMode('h')} accessibilityRole="button" accessibilityLabel="Heures">
              <Text style={[styles.big, mode === 'h' && styles.bigOn]}>{pad(h)}</Text>
            </Pressable>
            <Text style={styles.big}>:</Text>
            <Pressable onPress={() => setMode('m')} accessibilityRole="button" accessibilityLabel="Minutes">
              <Text style={[styles.big, mode === 'm' && styles.bigOn]}>{pad(m)}</Text>
            </Pressable>
          </View>
          <View style={styles.nudges}>
            <Button small variant="ghost" label="−1 min" onPress={() => nudge(-1)} testID="tp-minus" />
            <Button small variant="ghost" label="+1 min" onPress={() => nudge(1)} testID="tp-plus" />
          </View>
          <View style={styles.dial}>
            <View style={styles.center} />
            {mode === 'h'
              ? [
                  ...outer.map((v, i) => cell(String(v), h === v, () => (setH(v), setMode('m')), pos(i, 12, DIAL / 2 - 24), false, `tp-h-${v}`)),
                  ...inner.map((v, i) => cell(pad(v), h === v, () => (setH(v), setMode('m')), pos(i, 12, DIAL / 2 - 66), true, `tp-h-${v}`)),
                ]
              : minutes.map((v, i) => cell(pad(v), m === v, () => setM(v), pos(i, 12, DIAL / 2 - 24), false, `tp-m-${v}`))}
          </View>
          <View style={styles.actions}>
            <Button small variant="ghost" label="Maintenant" onPress={() => (props.onChange(nowHHMM()), props.onClose())} testID="tp-now" />
            <Button small variant="ghost" label="Effacer" onPress={() => (props.onChange(null), props.onClose())} testID="tp-clear" />
            <View style={{ flex: 1 }} />
            <Button small label="OK" variant="primary" onPress={() => (props.onChange(`${pad(h)}:${pad(m)}`), props.onClose())} testID="tp-ok" />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(5,4,12,0.7)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { width: 320, maxWidth: '100%', backgroundColor: colors.bgDeep, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 8, alignItems: 'center' },
  title: { color: colors.muted, fontFamily: fonts.bodySemi, fontSize: 15 },
  display: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  big: { color: colors.muted, fontFamily: fonts.display, fontSize: 46, paddingHorizontal: 6, borderRadius: 10 },
  bigOn: { color: colors.text, backgroundColor: colors.surfaceActive },
  nudges: { flexDirection: 'row', gap: 8 },
  dial: { width: DIAL, height: DIAL, borderRadius: DIAL / 2, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  center: { position: 'absolute', left: DIAL / 2 - 4, top: DIAL / 2 - 4, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  cell: { position: 'absolute', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cellOn: { backgroundColor: colors.accent },
  cellText: { color: colors.text, fontFamily: fonts.bodySemi, fontSize: 17 },
  cellSmall: { fontSize: 13, color: colors.muted },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'stretch', marginTop: 4 },
});
