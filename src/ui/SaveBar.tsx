import { StyleSheet, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { Button, IconButton, Txt } from './components';
import { colors } from './theme';

/**
 * Barre du bas des formulaires : tout s'enregistre déjà tout seul, mais « Enregistrer » donne un vrai geste de fin
 * (et referme le formulaire). Supprimer reste à côté.
 */
export function SaveBar(props: { onSave?: () => void; onDelete: () => void; bottomInset: number; deleteTestID: string }) {
  return (
    <View style={[styles.bar, { paddingBottom: 12 + props.bottomInset }]}>
      <IconButton image="supprimer" label="Supprimer" onPress={props.onDelete} testID={props.deleteTestID} />
      {props.onSave && (
        <Button label="Enregistrer" image="enregistrer-encre" variant="primary" onPress={props.onSave} style={styles.save} testID="save" />
      )}
    </View>
  );
}

/** « Enregistré à 7 h 32 » */
export function SavedAt(props: { at?: string }) {
  if (!props.at) return null;
  const d = new Date(props.at);
  const today = new Date().toDateString() === d.toDateString();
  const time = `${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`;
  return (
    <View style={styles.saved} testID="saved-at">
      <AppIcon name="coche" size={14} />
      <Txt faint size={13}>
        {today ? `Enregistré à ${time}` : `Enregistré le ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à ${time}`}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    backgroundColor: colors.bgDeep,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  save: { flex: 1, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' },
  saved: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-end' },
});
