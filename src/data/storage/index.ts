// Version Android (native). La version web est dans index.web.ts (Metro choisit automatiquement).
import { Directory, File, Paths } from 'expo-file-system';
import type { TextStorage } from './types';

const SUFFIX = '.json';

class FileTextStorage implements TextStorage {
  private dir = new Directory(Paths.document, 'grimoire-data');

  private ensureDir() {
    if (!this.dir.exists) this.dir.create({ intermediates: true, idempotent: true });
  }

  private file(name: string) {
    return new File(this.dir, name + SUFFIX);
  }

  async list() {
    this.ensureDir();
    return this.dir
      .list()
      .filter((e): e is File => e instanceof File && e.name.endsWith(SUFFIX))
      .map((f) => f.name.slice(0, -SUFFIX.length));
  }

  async read(name: string) {
    const f = this.file(name);
    return f.exists ? f.text() : null;
  }

  async write(name: string, text: string) {
    this.ensureDir();
    // Écriture sûre : on écrit dans un fichier temporaire puis on remplace,
    // pour ne jamais laisser un fichier à moitié écrit si l'app est coupée.
    const tmp = new File(this.dir, name + SUFFIX + '.tmp');
    tmp.create({ overwrite: true });
    await tmp.write(text);
    await tmp.move(this.file(name), { overwrite: true });
  }

  async remove(name: string) {
    const f = this.file(name);
    if (f.exists) f.delete();
  }
}

export function createStorage(): TextStorage {
  return new FileTextStorage();
}
