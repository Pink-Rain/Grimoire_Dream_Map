import { randomUUID } from 'expo-crypto';
import { useSyncExternalStore } from 'react';
import { createStorage } from './storage';
import { DataStore } from './store';

/** Le stockage local (aussi utilisé pour l'état de la synchro, sous le nom « local.sync »). */
export const appStorage = createStorage();

/** L'unique magasin de données de l'app. */
export const appStore = new DataStore({ storage: appStorage, generateId: () => randomUUID() });

/** Redessine le composant à chaque modification des données. */
export function useStoreVersion(): number {
  return useSyncExternalStore(
    (cb) => appStore.subscribe(cb),
    () => appStore.getVersion(),
  );
}
