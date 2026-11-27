/**
 * Journal des mises à jour affiché dans l'app (Réglages › Mises à jour).
 * RÈGLE : à chaque nouvelle version, ajouter une entrée EN HAUT, avec le même numéro que package.json
 * (un test le vérifie). Phrases courtes, simples, sans jargon, du point de vue de la personne qui utilise l'app.
 */
export interface ChangelogEntry {
  version: string;
  /** AAAA-MM-JJ */
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.6.4',
    date: '2026-11-27',
    changes: ['Un vrai journal des mises à jour dans les Réglages : tu vois ce qui a changé dans les dernières versions.'],
  },
  {
    version: '0.6.3',
    date: '2026-11-27',
    changes: [
      'Émotions et type de rêve deviennent des étiquettes : écris, appuie sur Entrée, et tes étiquettes te sont reproposées pendant que tu tapes.',
      'Plus de barres à curseur : humeur, clarté et ambiance se notent en touchant un emoji.',
      'La clarté du rêve est maintenant juste sous la lucidité.',
    ],
  },
  {
    version: '0.6.2',
    date: '2026-11-27',
    changes: [
      'Nouvelles icônes dessinées : sommeil, coucher, endormissement, réveil, lever, retour, vue PC, zoom, recentrer, lien et phases de lune de la lucidité.',
      'Dans le journal, une lune vide marque les notes rapides à compléter, une lune pleine les rêves complets.',
      'Sur téléphone, la rose des vents ne cache plus les lieux de la carte.',
    ],
  },
  {
    version: '0.6.1',
    date: '2026-11-27',
    changes: ['L’icône de l’app sur PC est maintenant transparente.'],
  },
  {
    version: '0.6.0',
    date: '2026-11-27',
    changes: [
      'Les mises à jour sur PC s’installent vraiment : « Redémarrer » ferme l’app et la rouvre à jour.',
      'Bouton « Rechercher les mises à jour » dans les Réglages.',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-11-27',
    changes: [
      'Nouveau type d’entrée : le sommeil (coucher, endormissement, réveils, lever), avec le calcul du temps de sommeil. Fonctionne aussi pour les siestes.',
      'Le journal regroupe les nuits et les rêves par jour.',
      'Météo du rêve, moment de la journée, humeur en emojis, clarté et ambiance.',
      'Ton logo et tes icônes dessinées partout dans l’app.',
    ],
  },
  {
    version: '0.4.0',
    date: '2026-11-27',
    changes: ['Mises à jour automatiques sur PC, et avertissement de nouvelle version sur Android.'],
  },
  {
    version: '0.3.0',
    date: '2026-11-27',
    changes: [
      'La carte des rêves : un parchemin qui se dessine au fil de tes rêves, avec les vrais lieux, les lieux imaginaires et les véhicules.',
      'Note rapide au réveil et rêve complet : lieux, personnes, lucidité, ambiance, couleurs, étiquettes.',
      'Notes vocales, images, musiques, vidéos, fichiers et liens dans les rêves.',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-11-27',
    changes: ['Synchronisation avec ton Google Drive sur PC.', 'Page de présentation pour télécharger l’app.'],
  },
  {
    version: '0.1.1',
    date: '2026-11-27',
    changes: ['Première version de Grimoire - Dream Map : journal de rêves, export et import, format téléphone sur PC.'],
  },
];
