/** Téléchargement et installation de l'APK : seulement sur Android (voir apk.android.ts). */
export async function cleanOldApks(): Promise<void> {}
export async function downloadApk(_url: string, _version: string, _onProgress: (ratio: number) => void): Promise<string> {
  throw new Error('Seulement sur Android.');
}
export async function openApkInstaller(_file: string): Promise<void> {}
