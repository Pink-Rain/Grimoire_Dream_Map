// Fichiers des médias — version web / PC : rangés dans IndexedDB (base « grimoire-dream-map-media »).
import { createStore, del, get, set } from 'idb-keyval';

const store = createStore('grimoire-dream-map-media', 'files');
const urlCache = new Map<string, string>();

function newId(ext: string) {
  return `${crypto.randomUUID()}.${ext}`;
}

export function extensionOf(name: string, fallback: string): string {
  const m = /\.([a-z0-9]{1,6})$/i.exec(name);
  return (m ? m[1] : fallback).toLowerCase();
}

async function saveBlob(blob: Blob, ext: string): Promise<string> {
  const localId = newId(ext);
  await set(localId, blob, store);
  return localId;
}

export async function uriFor(localId: string): Promise<string | null> {
  const cached = urlCache.get(localId);
  if (cached) return cached;
  const blob = await get<Blob>(localId, store);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(localId, url);
  return url;
}

export async function removeMedia(localId: string): Promise<void> {
  await del(localId, store);
  const url = urlCache.get(localId);
  if (url) URL.revokeObjectURL(url);
  urlCache.delete(localId);
}

/** Télécharge le fichier (l'app PC demande où l'enregistrer). */
export async function openMedia(localId: string, _mime?: string, name?: string): Promise<void> {
  const url = await uriFor(localId);
  if (!url) throw new Error('Ce fichier n’est pas sur cet appareil.');
  const a = document.createElement('a');
  a.href = url;
  a.download = name || localId;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export interface PickedFile {
  localId: string;
  name: string;
  mime?: string;
}

export function pickAndStore(accept: 'image' | 'audio' | 'video' | 'any'): Promise<PickedFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (accept !== 'any') input.accept = `${accept}/*`;
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      const localId = await saveBlob(f, extensionOf(f.name, 'bin'));
      resolve({ localId, name: f.name, mime: f.type || undefined });
    };
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

/** Range un enregistrement terminé : sur le web, l'enregistreur donne une adresse « blob: ». */
export async function storeRecording(uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  const ext = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'm4a' : 'webm';
  return saveBlob(blob, ext);
}
