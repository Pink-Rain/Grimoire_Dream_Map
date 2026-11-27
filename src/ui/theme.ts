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

/** Humeur 1 → 5. */
export const MOOD_LEVELS = [
  { value: 1, label: 'Très mauvaise', icon: 'thunderstorm-outline' },
  { value: 2, label: 'Mauvaise', icon: 'rainy-outline' },
  { value: 3, label: 'Neutre', icon: 'cloud-outline' },
  { value: 4, label: 'Bonne', icon: 'partly-sunny-outline' },
  { value: 5, label: 'Excellente', icon: 'sunny-outline' },
] as const;
