// Fichiers des médias (notes vocales, images, musiques, fichiers) — version Android.
// Rangés dans le dossier privé de l'app, sous « dreammap-media », exclu de la sauvegarde automatique
// d'Android (limitée à 25 Mo) par le plugin plugins/withBackupRules.js.
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { randomUUID } from 'expo-crypto';

const dir = new Directory(Paths.document, 'dreammap-media');

function ensureDir() {
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
}

export function extensionOf(name: string, fallback: string): string {
  const m = /\.([a-z0-9]{1,6})$/i.exec(name);
  return (m ? m[1] : fallback).toLowerCase();
}

/** Copie un fichier (ex. enregistrement) dans le dossier des médias. Renvoie son identifiant local. */
export async function saveFromUri(uri: string, ext: string): Promise<string> {
  ensureDir();
  const localId = `${randomUUID()}.${ext}`;
  await new File(uri).copy(new File(dir, localId));
  return localId;
}

/** Adresse lisible par les lecteurs (son, image). null si le fichier n'est pas sur cet appareil. */
export async function uriFor(localId: string): Promise<string | null> {
  const f = new File(dir, localId);
  return f.exists ? f.uri : null;
}

export async function removeMedia(localId: string): Promise<void> {
  const f = new File(dir, localId);
  if (f.exists) f.delete();
}

/** Ouvre / partage le fichier avec une autre application. */
export async function openMedia(localId: string, mime?: string, name?: string): Promise<void> {
  const f = new File(dir, localId);
  if (!f.exists) throw new Error('Ce fichier n’est pas sur cet appareil.');
  await Sharing.shareAsync(f.uri, { mimeType: mime, dialogTitle: name });
}

export interface PickedFile {
  localId: string;
  name: string;
  mime?: string;
}

/** Ouvre le sélecteur de fichiers et range le fichier choisi. null si annulé. */
export async function pickAndStore(accept: 'image' | 'audio' | 'video' | 'any'): Promise<PickedFile | null> {
  const type = accept === 'image' ? 'image/*' : accept === 'audio' ? 'audio/*' : accept === 'video' ? 'video/*' : '*/*';
  const res = await DocumentPicker.getDocumentAsync({ type, copyToCacheDirectory: true });
  if (res.canceled || !res.assets[0]) return null;
  const a = res.assets[0];
  const localId = await saveFromUri(a.uri, extensionOf(a.name, 'bin'));
  return { localId, name: a.name, mime: a.mimeType };
}

/** Range un enregistrement audio terminé (uri donné par l'enregistreur). */
export async function storeRecording(uri: string): Promise<string> {
  return saveFromUri(uri, extensionOf(uri, 'm4a'));
}
