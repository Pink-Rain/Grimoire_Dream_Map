// Version web / PC : IndexedDB (pas de limite de 5 Mo comme localStorage).
import { createStore, del, get, keys, set } from 'idb-keyval';
import type { TextStorage } from './types';

class IdbTextStorage implements TextStorage {
  private store = createStore('grimoire-dream-map', 'data');

  async list() {
    return (await keys(this.store)).map(String);
  }
  async read(name: string) {
    return (await get<string>(name, this.store)) ?? null;
  }
  async write(name: string, text: string) {
    await set(name, text, this.store);
  }
  async remove(name: string) {
    await del(name, this.store);
  }
}

export function createStorage(): TextStorage {
  // Demande au navigateur de ne pas effacer nos données en cas de manque de place.
  try {
    navigator.storage?.persist?.().catch(() => {});
  } catch {}
  return new IdbTextStorage();
}
