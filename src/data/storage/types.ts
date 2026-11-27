/**
 * Stockage local très simple : des textes (JSON) rangés sous un nom.
 * - Android : un fichier par nom dans le dossier privé de l'app (inclus dans la sauvegarde Android).
 * - Web / PC : IndexedDB du navigateur (ou de l'app PC).
 */
export interface TextStorage {
  /** Tous les noms enregistrés. */
  list(): Promise<string[]>;
  read(name: string): Promise<string | null>;
  write(name: string, text: string): Promise<void>;
  remove(name: string): Promise<void>;
}

/** Version en mémoire, pour les tests. */
export class MemoryStorage implements TextStorage {
  readonly items = new Map<string, string>();
  async list() {
    return [...this.items.keys()];
  }
  async read(name: string) {
    return this.items.get(name) ?? null;
  }
  async write(name: string, text: string) {
    this.items.set(name, text);
  }
  async remove(name: string) {
    this.items.delete(name);
  }
}
