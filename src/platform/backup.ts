// Export / import de fichier — version Android. (Version web/PC : backup.web.ts)
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Enregistre le texte dans un fichier puis ouvre le menu « Partager » d'Android (Drive, Fichiers, mail…). */
export async function saveTextFile(fileName: string, text: string): Promise<void> {
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  await file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Enregistrer mes données' });
}

/** Ouvre le sélecteur de fichier. Renvoie le contenu, ou null si la personne annule. */
export async function pickTextFile(): Promise<string | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (res.canceled || !res.assets[0]) return null;
  return new File(res.assets[0].uri).text();
}
