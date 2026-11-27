import { Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { appStore } from '../data/appStore';
import { localDateString, parseExportBundle } from '../data/records';
import { pickTextFile, saveTextFile } from '../platform/backup';
import { desktop } from '../platform/desktop';
import { confirmAsync, notify } from '../platform/dialogs';
import { Button, Section } from './components';
import { colors } from './theme';

const APP_VERSION: string = require('../../package.json').version;

export function SettingsScreen(props: { bottomInset: number }) {
  async function onExport() {
    try {
      await appStore.flush();
      const json = JSON.stringify(appStore.exportBundle(), null, 1);
      await saveTextFile(`dream-map-export-${localDateString()}.json`, json);
    } catch (e) {
      notify('Export impossible', String(e));
    }
  }

  async function onImport() {
    try {
      const text = await pickTextFile();
      if (text == null) return;
      const parsed = parseExportBundle(text);
      if (!parsed.ok) return notify('Import impossible', parsed.reason);
      const ok = await confirmAsync(
        'Importer ces données ?',
        'Les rêves du fichier seront ajoutés. Si un rêve existe des deux côtés, la version modifiée le plus récemment est gardée.',
        'Importer',
      );
      if (!ok) return;
      const r = appStore.importBundle(parsed.bundle);
      await appStore.flush();
      notify('Import terminé', `${r.added} ajouté(s), ${r.updated} mis à jour, ${r.unchanged} déjà à jour.`);
    } catch (e) {
      notify('Import impossible', String(e));
    }
  }

  const where =
    Platform.OS === 'android'
      ? 'Tes rêves sont enregistrés uniquement sur ce téléphone (et dans la sauvegarde automatique d’Android si elle est activée).'
      : desktop
        ? 'Tes rêves sont enregistrés uniquement sur cet ordinateur, dans l’application.'
        : 'Tes rêves sont enregistrés uniquement dans ce navigateur, sur cet ordinateur.';

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 24 + props.bottomInset }]}>
      <Section title="Mes données">
        <Text style={styles.p}>{where}</Text>
        <Text style={styles.p}>
          Pour changer d’appareil ou garder une copie de secours, exporte tes données dans un fichier, puis importe ce
          fichier sur l’autre appareil.
        </Text>
        <Button label="Exporter mes données" icon="download-outline" onPress={onExport} testID="export" />
        <Button label="Importer des données" icon="push-outline" onPress={onImport} testID="import" />
      </Section>
      <Section title="À propos">
        <Text style={styles.p}>Grimoire - Dream Map — version {APP_VERSION}</Text>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  p: { color: colors.muted, fontSize: 15, lineHeight: 22 },
});
