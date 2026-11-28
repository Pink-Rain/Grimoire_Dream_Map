import type { SyncAuth } from './auth';

/** Web et PC : pas de connexion native (le PC passe par Electron, voir desktop/google.js). */
export function nativeAuth(): SyncAuth | null {
  return null;
}
