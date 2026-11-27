import { useCallback, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { desktop } from '../platform/desktop';
import { PHONE_BREAKPOINT } from './theme';

const KEY = 'grimoire-dream-map.phoneMode';

function readSaved(): boolean {
  if (desktop) return desktop.initialPhoneMode;
  if (Platform.OS !== 'web') return false;
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export interface LayoutMode {
  /** Mise en page téléphone (un écran à la fois) ou ordinateur (liste + détail côte à côte). */
  isPhoneLayout: boolean;
  /** Format téléphone forcé sur PC. */
  phoneMode: boolean;
  /** Afficher le bouton téléphone/ordinateur ? (seulement sur PC) */
  showToggle: boolean;
  /** Dans un navigateur, le format téléphone s'affiche dans un cadre au centre. */
  showPhoneFrame: boolean;
  togglePhoneMode(): void;
}

export function useLayoutMode(): LayoutMode {
  const { width } = useWindowDimensions();
  const [phoneMode, setPhoneMode] = useState(readSaved);

  const togglePhoneMode = useCallback(() => {
    setPhoneMode((prev) => {
      const next = !prev;
      if (desktop) desktop.setPhoneMode(next);
      else {
        try {
          localStorage.setItem(KEY, next ? '1' : '0');
        } catch {}
      }
      return next;
    });
  }, []);

  if (Platform.OS !== 'web') {
    return { isPhoneLayout: width < PHONE_BREAKPOINT, phoneMode: false, showToggle: false, showPhoneFrame: false, togglePhoneMode };
  }
  const narrow = width < PHONE_BREAKPOINT;
  return {
    isPhoneLayout: phoneMode || narrow,
    phoneMode,
    // Sur un vrai petit écran (navigateur d'un téléphone), le bouton n'a pas d'intérêt.
    showToggle: !!desktop || phoneMode || !narrow,
    showPhoneFrame: phoneMode && !desktop && !narrow,
    togglePhoneMode,
  };
}
