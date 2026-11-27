import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { appStore } from '../data/appStore';
import { localDateString } from '../data/records';
import { confirmAsync } from '../platform/dialogs';
import { Button, IconButton } from './components';
import { addDays, formatLongDate } from './dates';
import { colors, fonts } from './theme';

/**
 * Éditeur d'un rêve. Enregistre tout seul à chaque modification.
 * Un nouveau rêve n'est créé qu'à partir du moment où on écrit quelque chose
 * (on ne garde pas de rêves vides).
 */
export function DreamEditor(props: { dreamId: string; onDeleted: () => void; bottomInset: number }) {
  const existing = appStore.get('dreams', props.dreamId);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [text, setText] = useState(existing?.text ?? '');
  const [dreamDate, setDreamDate] = useState(existing?.dreamDate ?? localDateString());
  const [saved, setSaved] = useState(!!existing);
  const exists = useRef(!!existing);

  function commit(fields: { title?: string; text?: string; dreamDate?: string }) {
    const next = { title, text, dreamDate, ...fields };
    if (!exists.current && !next.title.trim() && !next.text.trim()) return;
    appStore.save('dreams', props.dreamId, next);
    exists.current = true;
    setSaved(true);
  }

  async function onDelete() {
    if (!exists.current) return props.onDeleted();
    const ok = await confirmAsync('Supprimer ce rêve ?', 'Il sera supprimé de cet appareil.', 'Supprimer');
    if (!ok) return;
    appStore.remove('dreams', props.dreamId);
    props.onDeleted();
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'web' ? undefined : 'padding'}>
      <ScrollView style={styles.flex} contentContainerStyle={[styles.content, { paddingBottom: 24 + props.bottomInset }]} keyboardShouldPersistTaps="handled">
        <View style={styles.dateRow}>
          <IconButton icon="chevron-back" label="Jour précédent" onPress={() => { const d = addDays(dreamDate, -1); setDreamDate(d); commit({ dreamDate: d }); }} />
          <Text style={styles.date} testID="dream-date">{formatLongDate(dreamDate)}</Text>
          <IconButton icon="chevron-forward" label="Jour suivant" onPress={() => { const d = addDays(dreamDate, 1); setDreamDate(d); commit({ dreamDate: d }); }} />
        </View>

        <TextInput
          testID="dream-title"
          style={styles.title}
          value={title}
          onChangeText={(v) => { setTitle(v); commit({ title: v }); }}
          placeholder="Titre du rêve"
          placeholderTextColor={colors.faint}
          maxLength={200}
        />
        <TextInput
          testID="dream-text"
          style={styles.text}
          value={text}
          onChangeText={(v) => { setText(v); commit({ text: v }); }}
          placeholder="Raconte ton rêve…"
          placeholderTextColor={colors.faint}
          multiline
          textAlignVertical="top"
          autoFocus={!existing}
        />

        <View style={styles.footer}>
          <Text style={styles.status}>{saved ? 'Enregistré automatiquement' : 'Commence à écrire pour créer le rêve'}</Text>
          <Button label="Supprimer" icon="trash-outline" variant="danger" onPress={onDelete} testID="delete-dream" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 12, maxWidth: 820, width: '100%', alignSelf: 'center', flexGrow: 1 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  date: { color: colors.muted, fontSize: 15, textAlign: 'center', flexShrink: 1 },
  title: {
    color: colors.text,
    fontSize: 24,
    fontFamily: fonts.title,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  text: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 26,
    minHeight: 260,
    flexGrow: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  status: { color: colors.faint, fontSize: 13 },
});
