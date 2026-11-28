import type { AuthorizedRequest } from './drive';

/** Connexion Google d'une plateforme (PC : Electron ; Android : connexion Google native). */
export interface SyncAuth {
  configured: boolean;
  account(): { email: string } | null;
  /** Retrouve la connexion d'avant (au démarrage de l'app). */
  restore?(): Promise<void>;
  signIn(): Promise<{ email: string }>;
  signOut(): Promise<void>;
  request: AuthorizedRequest;
}
