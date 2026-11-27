import { Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { appStore } from '../data/appStore';
import { localDateString, parseExportBundle } from '../data/records';
import { pickTextFile, saveTextFile } from '../platform/backup';
import { desktop } from '../platform/desktop';
import { confirmAsync, notify } from '../platform/dialogs';
import { syncManager, useSyncStatus } from '../sync/syncManager';
import { Button, Section } from './components';
import { colors, fonts } from './theme';

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
      <SyncSection />
      <Section title="À propos">
        <Text style={styles.p}>Grimoire - Dream Map — version {APP_VERSION}</Text>
        <Text style={styles.p}>
          Dessins de la carte : game-icons.net, par Lorc, Delapouite et leurs contributeurs, sous licence Creative Commons
          Attribution 3.0 (CC BY 3.0). Polices : IM Fell English et EB Garamond (SIL Open Font License).
        </Text>
      </Section>
    </ScrollView>
  );
}

function SyncSection() {
  const s = useSyncStatus();
  if (!s.supported) {
    return (
      <Section title="Synchronisation">
        <Text style={styles.p}>La synchronisation avec Google Drive arrive bientôt sur cet appareil.</Text>
      </Section>
    );
  }
  if (!s.configured) {
    return (
      <Section title="Synchronisation">
        <Text style={styles.p}>La synchronisation n’est pas disponible dans cette version de l’application.</Text>
      </Section>
    );
  }
  if (!s.account) {
    return (
      <Section title="Synchronisation">
        <Text style={styles.p}>
          Connecte-toi avec Google pour retrouver tes rêves sur ton téléphone et ton ordinateur. Ils sont rangés dans
          un dossier caché de ton Google Drive, réservé à Dream Map : l’app ne voit aucun de tes autres fichiers.
        </Text>
        {s.signingIn && <Text style={styles.p}>Ton navigateur s’est ouvert : connecte-toi, puis reviens ici.</Text>}
        {!!s.error && <Text style={styles.error}>{s.error}</Text>}
        <Button
          label={s.signingIn ? 'Connexion en cours…' : 'Se connecter avec Google'}
          icon="logo-google"
          variant="primary"
          onPress={() => void syncManager.signIn()}
          testID="google-sign-in"
        />
      </Section>
    );
  }
  const last = s.lastSyncAt
    ? new Date(s.lastSyncAt).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : 'pas encore';
  return (
    <Section title="Synchronisation">
      <Text style={styles.p} testID="sync-account">
        Connecté{s.account.email ? ` : ${s.account.email}` : ' à Google'}
      </Text>
      <Text style={styles.p}>{s.syncing ? 'Synchronisation en cours…' : `Dernière synchronisation : ${last}`}</Text>
      {!!s.error && <Text style={styles.error}>{s.error}</Text>}
      <Button label="Synchroniser maintenant" icon="sync-outline" onPress={() => void syncManager.syncNow()} testID="sync-now" />
      <Button
        label="Se déconnecter"
        icon="log-out-outline"
        onPress={async () => {
          const ok = await confirmAsync(
            'Se déconnecter de Google ?',
            'Tes rêves restent sur cet appareil et dans ton Google Drive. La synchronisation s’arrête.',
            'Se déconnecter',
          );
          if (ok) await syncManager.signOut();
        }}
        testID="google-sign-out"
      />
    </Section>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, fontSize: 16, lineHeight: 23, fontFamily: fonts.body },
  content: { padding: 16, gap: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  p: { color: colors.muted, fontSize: 16, lineHeight: 23, fontFamily: fonts.body },
});
