/**
 * Pont vers l'app PC (.exe, Electron). N'existe que dans l'app PC ;
 * dans un navigateur ou sur Android, `desktop` vaut null.
 * Défini côté PC dans desktop/preload.js.
 */
export interface DesktopBridge {
  isDesktopApp: true;
  appVersion: string;
  /** Mode téléphone au démarrage (mémorisé par l'app PC). */
  initialPhoneMode: boolean;
  /** Redimensionne la fenêtre en format téléphone (true) ou ordinateur (false). */
  setPhoneMode(on: boolean): void;
  /** Appelé par l'app PC avant de fermer la fenêtre, pour finir d'enregistrer. */
  onBeforeClose(handler: () => Promise<void>): void;
}

declare global {
  interface Window {
    grimoireDesktop?: DesktopBridge;
  }
}

export const desktop: DesktopBridge | null =
  typeof window !== 'undefined' && window.grimoireDesktop ? window.grimoireDesktop : null;
