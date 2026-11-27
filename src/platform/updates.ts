/**
 * Mises à jour, pour l'interface (bandeau + Réglages).
 * - App PC : electron-updater (desktop/main.js) — téléchargement auto, « Redémarrer ».
 * - Android hors Play Store : on regarde la dernière version sur GitHub et on propose l'APK.
 * - Navigateur : rien (la version web est toujours la dernière).
 */
import { useEffect, useSyncExternalStore } from 'react';
import { Linking, Platform } from 'react-native';
import { desktop, type DesktopUpdateState } from './desktop';
import { compareVersions, parseLatestRelease, RELEASES_API } from './version';

export const APP_VERSION: string = require('../../package.json').version;

export type UpdateState =
  | DesktopUpdateState
  | { status: 'available'; version: string; apkUrl: string };

export const updatesSupported = !!desktop?.update || Platform.OS === 'android';

let state: UpdateState = desktop?.update?.get() ?? { status: 'idle' };
const listeners = new Set<() => void>();
function set(s: UpdateState) {
  state = s;
  for (const l of listeners) l();
}
desktop?.update?.onChange((s) => set(s));

async function checkAndroid(): Promise<void> {
  set({ status: 'checking' });
  try {
    const r = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) throw new Error(`GitHub a répondu ${r.status}`);
    const rel = parseLatestRelease(await r.json());
    if (rel && rel.apkUrl && compareVersions(rel.version, APP_VERSION) > 0) set({ status: 'available', version: rel.version, apkUrl: rel.apkUrl });
    else set({ status: 'latest', version: APP_VERSION, checkedAt: Date.now() });
  } catch (e) {
    set({ status: 'error', message: e instanceof Error ? e.message : 'Pas de connexion internet.' });
  }
}

/** Lance une recherche de mise à jour (bouton des Réglages). */
export async function checkForUpdates(): Promise<void> {
  if (desktop?.update) await desktop.update.check();
  else if (Platform.OS === 'android') await checkAndroid();
}

/** Installe : redémarrage (PC) ou téléchargement de l'APK (Android). */
export function installUpdate(): void {
  if (state.status === 'ready') desktop?.update?.install();
  else if (state.status === 'available') void Linking.openURL(state.apkUrl);
}

export function openUpdateLog(): void {
  desktop?.update?.openLog();
}

let androidAutoChecked = false;
export function useUpdateState(): UpdateState {
  useEffect(() => {
    if (Platform.OS === 'android' && !desktop && !androidAutoChecked) {
      androidAutoChecked = true;
      void checkAndroid();
    }
  }, []);
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}
