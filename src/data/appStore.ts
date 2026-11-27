import { randomUUID } from 'expo-crypto';
import { useSyncExternalStore } from 'react';
import { createStorage } from './storage';
import { DataStore } from './store';

/** L'unique magasin de données de l'app. */
export const appStore = new DataStore({ storage: createStorage(), generateId: () => randomUUID() });

/** Redessine le composant à chaque modification des données. */
export function useStoreVersion(): number {
  return useSyncExternalStore(
    (cb) => appStore.subscribe(cb),
    () => appStore.getVersion(),
  );
}
