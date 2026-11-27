import { AppIcon } from './AppIcon';
import Svg, { Path } from 'react-native-svg';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { appStore } from '../data/appStore';
import { RECENT_CHANGES } from '../data/changelog';
import { localDateString, parseExportBundle } from '../data/records';
import { pickTextFile, saveTextFile } from '../platform/backup';
import { desktop } from '../platform/desktop';
import { confirmAsync, notify } from '../platform/dialogs';
import { syncManager, useSyncStatus } from '../sync/syncManager';
import { APP_VERSION as CURRENT_VERSION, checkForUpdates, installUpdate, openUpdateLog, updatesSupported, useUpdateState } from '../platform/updates';
import { desktop as desktopBridge } from '../platform/desktop';
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
        <Button label="Exporter mes données" image="exporter" onPress={onExport} testID="export" />
        <Button label="Importer des données" image="importer" onPress={onImport} testID="import" />
      </Section>
      <SyncSection />
      {updatesSupported && <UpdatesSection />}
      <ChangelogSection />
      <Section title="À propos">
        <Text style={styles.p}>Grimoire - Dream Map — version {APP_VERSION}</Text>
        <Text style={styles.p}>
          Dessins de la carte : game-icons.net, par Lorc, Delapouite et leurs contributeurs, sous licence Creative Commons
          Attribution 3.0 (CC BY 3.0). Humeurs : d’après les Fluent Emoji de Microsoft (licence MIT). Polices : IM Fell English et EB
          Garamond (SIL Open Font License).
        </Text>
      </Section>
    </ScrollView>
  );
}

function UpdatesSection() {
  const s = useUpdateState();
  const busy = s.status === 'checking' || s.status === 'downloading' || s.status === 'installing';
  const line =
    s.status === 'checking'
      ? 'Recherche en cours…'
      : s.status === 'latest'
        ? 'Tu as la dernière version.'
        : s.status === 'downloading'
          ? `Téléchargement de la version ${s.version}… ${s.percent} %`
          : s.status === 'ready'
            ? `La version ${s.version} est prête à être installée.`
            : s.status === 'installing'
              ? `Installation de la version ${s.version}… l’app va se fermer puis se rouvrir.`
              : s.status === 'available'
                ? `La version ${s.version} est disponible.`
                : s.status === 'error'
                  ? `La recherche a échoué : ${s.message}`
                  : desktopBridge
                    ? 'L’app vérifie toute seule au démarrage puis toutes les 4 heures.'
                    : 'L’app vérifie toute seule à chaque ouverture.';
  return (
    <Section title="Mises à jour">
      <Text style={styles.p}>Version installée : {CURRENT_VERSION}</Text>
      <Text style={[styles.p, s.status === 'error' && { color: colors.danger }]} testID="update-status">
        {line}
      </Text>
      {s.status === 'ready' && <Button label="Redémarrer pour installer" image="redemarrer" variant="primary" onPress={installUpdate} testID="update-install" />}
      {s.status === 'available' && <Button label="Télécharger la nouvelle version" image="maj-telecharger" variant="primary" onPress={installUpdate} testID="update-install" />}
      <Button label="Rechercher les mises à jour" image="maj-rechercher" onPress={() => void checkForUpdates()} disabled={busy} testID="update-check" />
      {desktopBridge && <Button label="Rapport technique (en cas de souci)" image="rapport" variant="ghost" onPress={openUpdateLog} testID="update-log" />}
    </Section>
  );
}

/** Journal des mises à jour : les trois dernières versions (l'historique complet est sur la page GitHub). */
function ChangelogSection() {
  return (
    <Section title="Journal des mises à jour">
      {RECENT_CHANGES.map((e) => (
        <View key={e.version} style={styles.release} testID="changelog-entry">
          <View style={styles.releaseHead}>
            <Text style={styles.releaseVersion}>Version {e.version}</Text>
            {e.version === CURRENT_VERSION && <Text style={styles.releaseBadge}>installée</Text>}
            <View style={{ flex: 1 }} />
            <Text style={styles.releaseDate}>
              {new Date(e.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>
          {e.changes.map((c, i) => (
            <View key={i} style={styles.changeRow}>
              <Text style={styles.bullet}>✦</Text>
              <Text style={[styles.p, { flex: 1 }]}>{c}</Text>
            </View>
          ))}
        </View>
      ))}
    </Section>
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
          leading={<GoogleG />}
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
      <Button label="Synchroniser maintenant" image="synchroniser" onPress={() => void syncManager.syncNow()} testID="sync-now" />
      <Button
        label="Se déconnecter"
        image="deconnexion"
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
  release: { gap: 6, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  releaseHead: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  releaseVersion: { color: colors.text, fontFamily: fonts.display, fontSize: 19 },
  releaseBadge: {
    color: colors.accentText,
    backgroundColor: colors.accent,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  releaseDate: { color: colors.faint, fontFamily: fonts.body, fontSize: 14 },
  changeRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bullet: { color: colors.ochre, fontSize: 12, lineHeight: 23 },
  error: { color: colors.danger, fontSize: 16, lineHeight: 23, fontFamily: fonts.body },
  content: { padding: 16, gap: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  p: { color: colors.muted, fontSize: 16, lineHeight: 23, fontFamily: fonts.body },
});

/** Logo « G » officiel de Google (bouton de connexion, comme le demandent les règles de Google). */
function GoogleG() {
  return (
    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={16} height={16} viewBox="0 0 48 48">
        <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </Svg>
    </View>
  );
}
