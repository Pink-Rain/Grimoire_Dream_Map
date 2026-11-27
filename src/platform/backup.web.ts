// Export / import de fichier — version web et PC.

/** Télécharge le texte comme un fichier (l'app PC demande où l'enregistrer). */
export async function saveTextFile(fileName: string, text: string): Promise<void> {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Ouvre le sélecteur de fichier. Renvoie le contenu, ou null si la personne annule. */
export function pickTextFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const f = input.files?.[0];
      resolve(f ? await f.text() : null);
    };
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}
