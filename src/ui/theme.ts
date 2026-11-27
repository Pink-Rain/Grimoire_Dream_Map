import { Platform } from 'react-native';

export const colors = {
  bg: '#0f0d1a',
  surface: '#1a1630',
  surfaceHover: '#231e40',
  surfaceActive: '#2d2652',
  border: '#2e2852',
  text: '#ece8ff',
  muted: '#9d95c7',
  faint: '#6b6494',
  accent: '#b69cff',
  accentText: '#140f26',
  danger: '#ff7a8a',
};

export const fonts = {
  title: Platform.select({ android: 'serif', web: 'Georgia, "Times New Roman", serif', default: 'Georgia' }),
};

/** Largeur en dessous de laquelle on affiche la mise en page « téléphone ». */
export const PHONE_BREAKPOINT = 720;

/** Taille minimale des zones cliquables (recommandation Android : 48). */
export const TOUCH = 48;
