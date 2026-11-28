/**
 * Android (hors Play Store) : la nouvelle version (APK) est téléchargée DANS l'app (dossier cache, rien dans les
 * Téléchargements), puis Android ouvre son écran d'installation. Les APK sont effacés au lancement suivant.
 */
import * as FS from 'expo-file-system/legacy';
import { startActivityAsync } from 'expo-intent-launcher';

const DIR = `${FS.cacheDirectory}updates/`;
const FLAG_GRANT_READ_URI_PERMISSION = 1;

export async function cleanOldApks(): Promise<void> {
  try {
    await FS.deleteAsync(DIR, { idempotent: true });
  } catch {}
}

export async function downloadApk(url: string, version: string, onProgress: (ratio: number) => void): Promise<string> {
  await FS.makeDirectoryAsync(DIR, { intermediates: true }).catch(() => {});
  const dest = `${DIR}grimoire-dream-map-${version}.apk`;
  const task = FS.createDownloadResumable(url, dest, {}, (p) => {
    if (p.totalBytesExpectedToWrite > 0) onProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
  });
  const res = await task.downloadAsync();
  if (!res || res.status < 200 || res.status >= 300) throw new Error(`Téléchargement impossible (${res?.status ?? 'pas de réponse'})`);
  return res.uri;
}

export async function openApkInstaller(file: string): Promise<void> {
  const contentUri = await FS.getContentUriAsync(file);
  await startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    type: 'application/vnd.android.package-archive',
    flags: FLAG_GRANT_READ_URI_PERMISSION,
  });
}
