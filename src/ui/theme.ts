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
  image?: 'meteo-1' | 'meteo-2' | 'meteo-3' | 'meteo-4' | 'meteo-5';
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
  { value: 1, emoji: '🌫️', label: 'Très flou' },
  { value: 2, emoji: '🌁', label: 'Flou' },
  { value: 3, emoji: '🌥️', label: 'Moyen' },
  { value: 4, emoji: '🔍', label: 'Net' },
  { value: 5, emoji: '💎', label: 'Très net' },
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
  { id: 'soleil', emoji: '☀️', label: 'Ensoleillé', image: 'meteo-5' },
  { id: 'eclaircies', emoji: '🌤️', label: 'Éclaircies', image: 'meteo-4' },
  { id: 'partiel', emoji: '⛅', label: 'Partiellement nuageux' },
  { id: 'nuageux', emoji: '☁️', label: 'Nuageux', image: 'meteo-3' },
  { id: 'couvert', emoji: '🌥️', label: 'Couvert' },
  { id: 'brouillard', emoji: '🌫️', label: 'Brouillard' },
  { id: 'brume', emoji: '🌁', label: 'Brume' },
  { id: 'bruine', emoji: '💧', label: 'Bruine' },
  { id: 'averses', emoji: '🌦️', label: 'Averses' },
  { id: 'pluie', emoji: '🌧️', label: 'Pluie', image: 'meteo-2' },
  { id: 'deluge', emoji: '☔', label: 'Pluie battante' },
  { id: 'orage', emoji: '⛈️', label: 'Orage', image: 'meteo-1' },
  { id: 'eclairs', emoji: '🌩️', label: 'Éclairs' },
  { id: 'grele', emoji: '🧊', label: 'Grêle' },
  { id: 'neige', emoji: '🌨️', label: 'Neige' },
  { id: 'flocons', emoji: '❄️', label: 'Blizzard' },
  { id: 'verglas', emoji: '⛸️', label: 'Verglas' },
  { id: 'gel', emoji: '🥶', label: 'Froid glacial' },
  { id: 'vent', emoji: '🌬️', label: 'Vent' },
  { id: 'tempete', emoji: '💨', label: 'Tempête' },
  { id: 'tornade', emoji: '🌪️', label: 'Tornade' },
  { id: 'ouragan', emoji: '🌀', label: 'Ouragan' },
  { id: 'canicule', emoji: '🥵', label: 'Canicule' },
  { id: 'secheresse', emoji: '🌵', label: 'Sécheresse' },
  { id: 'sable', emoji: '🏜️', label: 'Tempête de sable' },
  { id: 'cendres', emoji: '🌋', label: 'Pluie de cendres' },
  { id: 'smog', emoji: '🏭', label: 'Smog' },
  { id: 'arc-en-ciel', emoji: '🌈', label: 'Arc-en-ciel' },
  { id: 'aurore', emoji: '🌌', label: 'Aurore boréale' },
  { id: 'etoiles', emoji: '🌠', label: 'Étoiles filantes' },
  { id: 'eclipse', emoji: '🌑', label: 'Éclipse' },
  { id: 'impossible', emoji: '🔮', label: 'Météo impossible' },
];

/** Moment du jour dans le rêve. */
export const TIMES_OF_DAY: EmojiOption[] = [
  { id: 'aube', emoji: '🌅', label: 'Aube' },
  { id: 'matin', emoji: '🌄', label: 'Matin' },
  { id: 'midi', emoji: '☀️', label: 'Plein jour' },
  { id: 'crepuscule', emoji: '🌇', label: 'Crépuscule' },
  { id: 'soir', emoji: '🌆', label: 'Soir' },
  { id: 'nuit', emoji: '🌙', label: 'Nuit' },
  { id: 'nuit-noire', emoji: '🌑', label: 'Nuit noire' },
  { id: 'jour-nuit', emoji: '🌗', label: 'Jour et nuit mêlés' },
  { id: 'hors-temps', emoji: '⏳', label: 'Hors du temps' },
];

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
