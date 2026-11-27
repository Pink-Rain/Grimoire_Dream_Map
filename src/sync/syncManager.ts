/**
 * Chef d'orchestre de la synchro : connexion Google, quand synchroniser, état affiché dans les réglages.
 *
 * Quand : au démarrage, quelques secondes après une modification, quand on revient sur l'app,
 * toutes les 5 minutes, et sur demande (« Synchroniser maintenant »).
 * Pour l'instant disponible dans l'app PC ; Android et navigateur viendront ensuite.
 */
import { AppState, Platform } from 'react-native';
import { useSyncExternalStore } from 'react';
import { appStorage, appStore } from '../data/appStore';
import { desktop } from '../platform/desktop';
import { createDriveApi, DriveError, type AuthorizedRequest } from './drive';
import { emptySyncState, syncOnce, type SyncState } from './engine';

const STATE_KEY = 'local.sync';
const AFTER_CHANGE_MS = 5_000;
const PERIOD_MS = 5 * 60_000;

interface SyncAuth {
  configured: boolean;
  account(): { email: string } | null;
  signIn(): Promise<{ email: string }>;
  signOut(): Promise<void>;
  request: AuthorizedRequest;
}

function platformAuth(): SyncAuth | null {
  const g = desktop?.google;
  if (!g) return null;
  return {
    configured: g.info().configured,
    account: () => g.info().account,
    signIn: () => g.signIn(),
    signOut: () => g.signOut(),
    request: (req) => g.request(req),
  };
}

export interface SyncStatus {
  /** La synchro existe-t-elle sur cet appareil (pour l'instant : app PC) ? */
  supported: boolean;
  configured: boolean;
  account: { email: string } | null;
  syncing: boolean;
  signingIn: boolean;
  lastSyncAt: string | null;
  error: string | null;
}

interface Persisted extends SyncState {
  account: string | null;
  lastSyncAt: string | null;
}

class SyncManager {
  private auth = platformAuth();
  private state: Persisted = { ...emptySyncState(), account: null, lastSyncAt: null };
  private status: SyncStatus = {
    supported: !!this.auth,
    configured: !!this.auth?.configured,
    account: this.auth?.account() ?? null,
    syncing: false,
    signingIn: false,
    lastSyncAt: null,
    error: null,
  };
  private listeners = new Set<() => void>();
  private running: Promise<void> | null = null;
  private again = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private started = false;

  getStatus = () => this.status;
  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  private set(patch: Partial<SyncStatus>) {
    this.status = { ...this.status, ...patch };
    for (const l of this.listeners) l();
  }

  /** Démarre la synchro automatique (appelé une fois, après le chargement des données). */
  async start() {
    if (this.started || !this.auth?.configured) return;
    this.started = true;
    try {
      const text = await appStorage.read(STATE_KEY);
      if (text) this.state = { ...this.state, ...JSON.parse(text) };
    } catch {}
    this.set({ lastSyncAt: this.state.lastSyncAt });

    // Après une modification des rêves (pas celles faites par la synchro elle-même).
    appStore.subscribe(() => {
      if (!this.running) this.schedule(AFTER_CHANGE_MS);
    });
    setInterval(() => this.schedule(0), PERIOD_MS);
    AppState.addEventListener('change', (s) => s === 'active' && this.schedule(0));
    if (Platform.OS === 'web') window.addEventListener('focus', () => this.schedule(1_000));

    this.schedule(0);
  }

  private schedule(delay: number) {
    if (!this.status.account) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.syncNow();
    }, delay);
  }

  /** Lance une synchro (si une est déjà en cours, en relance une juste après). */
  syncNow(): Promise<void> {
    if (!this.auth || !this.status.account) return Promise.resolve();
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = this.run().finally(() => {
      this.running = null;
      if (this.again) {
        this.again = false;
        void this.syncNow();
      }
    });
    return this.running;
  }

  private async run() {
    const auth = this.auth!;
    const email = this.status.account?.email ?? '';
    if (this.state.account !== email) {
      // Autre compte Google : on repart de zéro (on fusionne tout avec le Drive de ce compte).
      this.state = { ...emptySyncState(), account: email, lastSyncAt: null };
    }
    this.set({ syncing: true });
    try {
      await appStore.flush();
      const { state } = await syncOnce(appStore, createDriveApi(auth.request), this.state);
      this.state = { ...state, account: email, lastSyncAt: new Date().toISOString() };
      await appStorage.write(STATE_KEY, JSON.stringify(this.state));
      await appStore.flush();
      this.set({ syncing: false, error: null, lastSyncAt: this.state.lastSyncAt });
    } catch (e) {
      const message = e instanceof DriveError || e instanceof Error ? e.message : String(e);
      // Connexion expirée : l'app PC a déjà oublié le compte.
      this.set({ syncing: false, error: message, account: auth.account() });
    }
  }

  async signIn() {
    if (!this.auth) return;
    this.set({ signingIn: true, error: null });
    try {
      await this.auth.signIn();
      this.set({ signingIn: false, account: this.auth.account() });
      if (!this.started) await this.start();
      await this.syncNow();
    } catch (e) {
      this.set({ signingIn: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  async signOut() {
    if (!this.auth) return;
    await this.running;
    await this.auth.signOut();
    this.state = { ...emptySyncState(), account: null, lastSyncAt: null };
    await appStorage.write(STATE_KEY, JSON.stringify(this.state));
    this.set({ account: null, error: null, lastSyncAt: null });
  }
}

export const syncManager = new SyncManager();

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(syncManager.subscribe, syncManager.getStatus);
}
