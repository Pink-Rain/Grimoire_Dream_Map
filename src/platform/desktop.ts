/**
 * Pont vers l'app PC (.exe, Electron). N'existe que dans l'app PC ;
 * dans un navigateur ou sur Android, `desktop` vaut null.
 * Défini côté PC dans desktop/preload.js.
 */
import type { HttpRequest, HttpResponse } from '../sync/drive';

export type DesktopUpdateState =
  | { status: 'idle' }
  | { status: 'downloading'; version: string; percent: number }
  | { status: 'ready'; version: string };

export interface DesktopBridge {
  isDesktopApp: true;
  appVersion: string;
  /** Mode téléphone au démarrage (mémorisé par l'app PC). */
  initialPhoneMode: boolean;
  /** Redimensionne la fenêtre en format téléphone (true) ou ordinateur (false). */
  setPhoneMode(on: boolean): void;
  /** Appelé par l'app PC avant de fermer la fenêtre, pour finir d'enregistrer. */
  onBeforeClose(handler: () => Promise<void>): void;
  /** Mises à jour automatiques (electron-updater). */
  update?: {
    get(): DesktopUpdateState;
    onChange(cb: (s: DesktopUpdateState) => void): () => void;
    install(): void;
  };
  /** Connexion Google (synchro). Voir desktop/google.js. */
  google?: {
    info(): { configured: boolean; account: { email: string } | null };
    signIn(): Promise<{ email: string }>;
    signOut(): Promise<void>;
    request(req: HttpRequest): Promise<HttpResponse>;
  };
}

declare global {
  interface Window {
    grimoireDesktop?: DesktopBridge;
  }
}

export const desktop: DesktopBridge | null =
  typeof window !== 'undefined' && window.grimoireDesktop ? window.grimoireDesktop : null;
