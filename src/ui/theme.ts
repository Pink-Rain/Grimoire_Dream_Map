/**
 * Direction artistique « atlas de nuit » : papier bleu nuit / violet sombre, encre parchemin,
 * accents cuivre, bronze et ocre.
 */
export const colors = {
  bg: '#100e22',
  bgDeep: '#0a0918',
  surface: '#1a1733',
  surfaceHover: '#231f44',
  surfaceActive: '#2d2756',
  border: '#3a335f',
  borderSoft: '#2a2549',
  text: '#efe5cf',
  muted: '#bcb1cc',
  faint: '#8f85ad',
  accent: '#d48f52', // cuivre
  accentSoft: '#3a2a2a',
  accentText: '#1b1022',
  bronze: '#b8955c',
  ochre: '#d2a64b',
  danger: '#ee8296',
  // Carte
  paper: '#17142f',
  ink: '#e9dcc0',
};

export const fonts = {
  /** Titres : gravure de vieille carte. */
  display: 'IMFellEnglish_400Regular',
  displayItalic: 'IMFellEnglish_400Regular_Italic',
  /** Texte courant. */
  body: 'EBGaramond_400Regular',
  bodyItalic: 'EBGaramond_400Regular_Italic',
  bodySemi: 'EBGaramond_600SemiBold',
  bodyBold: 'EBGaramond_700Bold',
  /** Compatibilité avec l'ancien code. */
  title: 'IMFellEnglish_400Regular',
};

/** Largeur en dessous de laquelle on affiche la mise en page « téléphone ». */
export const PHONE_BREAKPOINT = 720;

/** Taille minimale des zones cliquables (recommandation Android : 48). */
export const TOUCH = 48;

/** Couleurs proposées pour les rêves (taches d'aquarelle sur la carte). */
export const DREAM_COLORS: { hex: string; name: string }[] = [
  { hex: '#5b6ee1', name: 'Indigo' },
  { hex: '#8e5fd8', name: 'Violet' },
  { hex: '#c25fa8', name: 'Prune' },
  { hex: '#e06a7a', name: 'Rose' },
  { hex: '#c9483f', name: 'Carmin' },
  { hex: '#d9873f', name: 'Cuivre' },
  { hex: '#d9b44a', name: 'Ocre' },
  { hex: '#8fb35a', name: 'Mousse' },
  { hex: '#3fa78a', name: 'Émeraude' },
  { hex: '#3fb0c4', name: 'Lagon' },
  { hex: '#7fa6d9', name: 'Ciel' },
  { hex: '#b9b0a0', name: 'Brume' },
];

/** Ambiances proposées (on peut en ajouter d'autres). */
export const AMBIANCES = [
  'Paisible',
  'Joyeux',
  'Magique',
  'Étrange',
  'Mystérieux',
  'Absurde',
  'Nostalgique',
  'Mélancolique',
  'Romantique',
  'Épique',
  'Angoissant',
  'Oppressant',
  'Effrayant',
  'Confus',
  'Excitant',
];

/** Échelle de lucidité 0 → 5. */
export const LUCIDITY_LABELS = [
  'Pas lucide',
  'Un doute',
  'Je savais que je rêvais',
  'Un peu de contrôle',
  'Beaucoup de contrôle',
  'Contrôle total',
];

/** Une option à choisir, avec son emoji. `id` est ce qui est enregistré (ne jamais le changer). */
export interface EmojiOption {
  id: string;
  emoji: string;
  label: string;
  /** Icône dessinée à la place de l'emoji (nom dans AppIcon). */
  image?: string;
}

/** Humeur 1 → 5 (emojis). */
export const MOOD_LEVELS = [
  { value: 1, emoji: '😫', label: 'Très mauvaise' },
  { value: 2, emoji: '🙁', label: 'Mauvaise' },
  { value: 3, emoji: '😐', label: 'Neutre' },
  { value: 4, emoji: '🙂', label: 'Bonne' },
  { value: 5, emoji: '😄', label: 'Excellente' },
] as const;

/** Clarté du souvenir 1 → 5. */
export const CLARITY_LEVELS = [
  { value: 1, emoji: '🌫️', label: 'Très flou', image: 'clarte-1' },
  { value: 2, emoji: '🌁', label: 'Flou', image: 'clarte-2' },
  { value: 3, emoji: '🌥️', label: 'Moyen', image: 'clarte-3' },
  { value: 4, emoji: '🔍', label: 'Net', image: 'clarte-4' },
  { value: 5, emoji: '💎', label: 'Très net', image: 'clarte-5' },
] as const;

/** Atmosphère du monde rêvé 1 → 5. */
export const ATMOSPHERE_LEVELS = [
  { value: 1, emoji: '👹', label: 'Cauchemardesque' },
  { value: 2, emoji: '🕸️', label: 'Inquiétante' },
  { value: 3, emoji: '🌗', label: 'Neutre' },
  { value: 4, emoji: '🌸', label: 'Douce' },
  { value: 5, emoji: '✨', label: 'Féerique' },
] as const;

/** Toutes les météos (réelles, plus une pour l'impossible). */
export const WEATHERS: EmojiOption[] = [
  { id: 'soleil', emoji: '☀️', label: 'Ensoleillé', image: 'meteo-soleil' },
  { id: 'eclaircies', emoji: '🌤️', label: 'Éclaircies', image: 'meteo-soleil-voile' },
  { id: 'partiel', emoji: '⛅', label: 'Partiellement nuageux', image: 'meteo-eclaircie' },
  { id: 'nuageux', emoji: '☁️', label: 'Nuageux', image: 'meteo-nuage' },
  { id: 'couvert', emoji: '🌥️', label: 'Couvert' },
  { id: 'brouillard', emoji: '🌫️', label: 'Brouillard' },
  { id: 'brume', emoji: '🌁', label: 'Brume' },
  { id: 'bruine', emoji: '💧', label: 'Bruine' },
  { id: 'averses', emoji: '🌦️', label: 'Averses', image: 'meteo-averse' },
  { id: 'pluie', emoji: '🌧️', label: 'Pluie', image: 'meteo-pluie' },
  { id: 'deluge', emoji: '☔', label: 'Pluie battante' },
  { id: 'orage', emoji: '⛈️', label: 'Orage', image: 'meteo-orage-pluie' },
  { id: 'eclairs', emoji: '🌩️', label: 'Éclairs', image: 'meteo-orage' },
  { id: 'grele', emoji: '🧊', label: 'Grêle' },
  { id: 'neige', emoji: '🌨️', label: 'Neige', image: 'meteo-neige' },
  { id: 'flocons', emoji: '❄️', label: 'Blizzard' },
  { id: 'verglas', emoji: '⛸️', label: 'Verglas' },
  { id: 'gel', emoji: '🥶', label: 'Froid glacial' },
  { id: 'vent', emoji: '🌬️', label: 'Vent' },
  { id: 'tempete', emoji: '💨', label: 'Tempête' },
  { id: 'tornade', emoji: '🌪️', label: 'Tornade', image: 'meteo-tornade' },
  { id: 'ouragan', emoji: '🌀', label: 'Ouragan' },
  { id: 'canicule', emoji: '🥵', label: 'Canicule' },
  { id: 'secheresse', emoji: '🌵', label: 'Sécheresse' },
  { id: 'sable', emoji: '🏜️', label: 'Tempête de sable' },
  { id: 'cendres', emoji: '🌋', label: 'Pluie de cendres' },
  { id: 'smog', emoji: '🏭', label: 'Smog' },
  { id: 'arc-en-ciel', emoji: '🌈', label: 'Arc-en-ciel', image: 'meteo-arc-en-ciel' },
  { id: 'aurore', emoji: '🌌', label: 'Aurore boréale' },
  { id: 'etoiles', emoji: '🌠', label: 'Étoiles filantes' },
  { id: 'eclipse', emoji: '🌑', label: 'Éclipse' },
  { id: 'impossible', emoji: '🔮', label: 'Météo impossible' },
];

/** Météos proposées dans le formulaire (les autres restent lisibles sur les anciens rêves). */
export const WEATHER_CHOICES: EmojiOption[] = ['soleil', 'eclaircies', 'partiel', 'nuageux', 'averses', 'pluie', 'neige', 'eclairs', 'orage', 'tornade', 'arc-en-ciel'].map(
  (id) => WEATHERS.find((w) => w.id === id)!,
);

/** Humeur : niveau de 0 à 5, et un emoji au choix dans chaque niveau. */
export const MOOD_GRID: { level: number; label: string; emojis: string[]; images: string[] }[] = [
  { level: 0, label: 'Horrible', emojis: ['😡', '🤮', '😭'], images: ['humeur-colere', 'humeur-degout', 'humeur-pleurs'] },
  { level: 1, label: 'Très mauvaise', emojis: ['😱', '😤', '😔'], images: ['humeur-peur', 'humeur-soupir', 'humeur-tristesse'] },
  { level: 2, label: 'Mauvaise', emojis: ['🫩', '🙄', '🫠'], images: ['humeur-ennui', 'humeur-agacement', 'humeur-gene'] },
  { level: 3, label: 'Mitigée', emojis: ['🙃', '🤭', '🙂'], images: ['humeur-ironie', 'humeur-gloussement', 'humeur-sourire'] },
  { level: 4, label: 'Bonne', emojis: ['🤗', '🥰', '😎'], images: ['humeur-tendresse', 'humeur-amour', 'humeur-cool'] },
  { level: 5, label: 'Excellente', emojis: ['😍', '😁', '🤣'], images: ['humeur-emerveille', 'humeur-joie', 'humeur-fou-rire'] },
];

/** Genres proposés (étiquettes). */
export const GENRES = [
  'Aventure',
  'Action',
  'Horreur',
  'Thriller',
  'Mystère',
  'Policier',
  'Comédie',
  'Romance',
  'Drame',
  'Fantastique',
  'Science-fiction',
  'Conte',
  'Épique',
  'Absurde',
  'Tranche de vie',
  'Post-apocalyptique',
  'Guerre',
  'Super-héros',
];

/** Facteurs de la veille proposés (étiquettes). */
export const SLEEP_FACTORS = ['Café', 'Thé', 'Alcool', 'Écrans tard', 'Sport', 'Stress', 'Repas tardif', 'Médicament', 'Sieste', 'Lecture', 'Méditation', 'Bruit', 'Chaleur', 'Froid', 'Douleur', 'Maladie'];

/** Lieux du sommeil proposés (étiquettes). */
export const SLEEP_PLACES = ['Chez moi', 'Chez quelqu’un', 'En voyage', 'Hôtel', 'Canapé', 'Train', 'Avion', 'Voiture', 'Tente', 'Hôpital'];

/** Sommeil : qualité 1 → 5. */
export const SLEEP_QUALITY = [
  { value: 1, emoji: '😫', label: 'Très mauvaise' },
  { value: 2, emoji: '😕', label: 'Mauvaise' },
  { value: 3, emoji: '😐', label: 'Moyenne' },
  { value: 4, emoji: '😌', label: 'Bonne' },
  { value: 5, emoji: '🤩', label: 'Excellente' },
] as const;

/** Sommeil : énergie au réveil 1 → 5. */
export const WAKE_ENERGY = [
  { value: 1, emoji: '🪫', label: 'À plat' },
  { value: 2, emoji: '🥱', label: 'Fatigue' },
  { value: 3, emoji: '😐', label: 'Moyenne' },
  { value: 4, emoji: '🙂', label: 'En forme' },
  { value: 5, emoji: '⚡', label: 'Pleine forme' },
] as const;

/** Moment du jour dans le rêve. */
export const TIMES_OF_DAY: EmojiOption[] = [
  { id: 'aube', emoji: '🌅', label: 'Aube', image: 'moment-aube' },
  { id: 'matin', emoji: '🌄', label: 'Matin' },
  { id: 'midi', emoji: '☀️', label: 'Journée', image: 'moment-journee' },
  { id: 'crepuscule', emoji: '🌇', label: 'Crépuscule', image: 'moment-crepuscule' },
  { id: 'soir', emoji: '🌆', label: 'Soir' },
  { id: 'nuit', emoji: '🌙', label: 'Nuit', image: 'moment-nuit' },
  { id: 'nuit-noire', emoji: '🌑', label: 'Nuit noire' },
  { id: 'jour-nuit', emoji: '🌗', label: 'Jour et nuit mêlés' },
  { id: 'hors-temps', emoji: '⏳', label: 'Hors du temps' },
];

/** Moments proposés dans le formulaire (les autres restent lisibles sur les anciens rêves). */
export const TIME_CHOICES: EmojiOption[] = ['aube', 'midi', 'crepuscule', 'nuit'].map((id) => TIMES_OF_DAY.find((t) => t.id === id)!);

/** Types de rêve. */
export const DREAM_TYPES: EmojiOption[] = [
  { id: 'cauchemar', emoji: '😱', label: 'Cauchemar' },
  { id: 'mauvais', emoji: '😟', label: 'Mauvais rêve' },
  { id: 'recurrent', emoji: '🔁', label: 'Récurrent' },
  { id: 'faux-reveil', emoji: '⏰', label: 'Faux réveil' },
  { id: 'paralysie', emoji: '🛏️', label: 'Paralysie du sommeil' },
  { id: 'premonitoire', emoji: '🔮', label: 'Prémonitoire' },
  { id: 'reve-dans-reve', emoji: '🪆', label: 'Rêve dans le rêve' },
  { id: 'demi-sommeil', emoji: '😪', label: 'Demi-sommeil' },
];

/** Émotions ressenties. */
export const EMOTIONS: EmojiOption[] = [
  { id: 'joie', emoji: '😄', label: 'Joie' },
  { id: 'serenite', emoji: '😌', label: 'Sérénité' },
  { id: 'amour', emoji: '🥰', label: 'Amour' },
  { id: 'emerveillement', emoji: '🤩', label: 'Émerveillement' },
  { id: 'excitation', emoji: '🤗', label: 'Excitation' },
  { id: 'liberte', emoji: '🕊️', label: 'Liberté' },
  { id: 'fierte', emoji: '😎', label: 'Fierté' },
  { id: 'surprise', emoji: '😮', label: 'Surprise' },
  { id: 'curiosite', emoji: '🧐', label: 'Curiosité' },
  { id: 'nostalgie', emoji: '🥹', label: 'Nostalgie' },
  { id: 'tristesse', emoji: '😢', label: 'Tristesse' },
  { id: 'solitude', emoji: '🫥', label: 'Solitude' },
  { id: 'peur', emoji: '😨', label: 'Peur' },
  { id: 'angoisse', emoji: '😰', label: 'Angoisse' },
  { id: 'colere', emoji: '😠', label: 'Colère' },
  { id: 'degout', emoji: '🤢', label: 'Dégoût' },
  { id: 'honte', emoji: '😳', label: 'Honte' },
  { id: 'culpabilite', emoji: '😔', label: 'Culpabilité' },
  { id: 'jalousie', emoji: '😒', label: 'Jalousie' },
  { id: 'confusion', emoji: '😵‍💫', label: 'Confusion' },
];

/** Libellé + emoji d'une valeur enregistrée (identifiant connu, ou mot libre ajouté par la personne). */
export function optionFor(list: EmojiOption[], value: string): EmojiOption {
  return list.find((o) => o.id === value) ?? { id: value, emoji: '✦', label: value };
}

/** Icône dessinée d'un emoji d'humeur (pour afficher l'humeur enregistrée). */
export function moodImageFor(emoji: string | null | undefined, level: number | null | undefined): string | undefined {
  for (const g of MOOD_GRID) {
    const i = emoji ? g.emojis.indexOf(emoji) : -1;
    if (i >= 0) return g.images[i];
  }
  const g = MOOD_GRID.find((x) => x.level === level);
  return g?.images[0];
}
