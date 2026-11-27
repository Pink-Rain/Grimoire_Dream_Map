import { Image, type ImageStyle, type StyleProp } from 'react-native';

/** Icônes dessinées pour Dream Map (or rose, émail crépuscule). Les « -encre » vont sur les boutons abricot. */
const ICONS = {
  logo: require('../../assets/logo-128.png'),
  'logo-grand': require('../../assets/logo-256.png'),
  boussole: require('../../assets/ui/boussole.png'),
  carte: require('../../assets/ui/carte.png'),
  'carte-encre': require('../../assets/ui/carte-encre.png'),
  'chevron-droit': require('../../assets/ui/chevron-droit.png'),
  'chevron-gauche': require('../../assets/ui/chevron-gauche.png'),
  eclair: require('../../assets/ui/eclair.png'),
  'eclair-encre': require('../../assets/ui/eclair-encre.png'),
  fermer: require('../../assets/ui/fermer.png'),
  fichier: require('../../assets/ui/fichier.png'),
  image: require('../../assets/ui/image.png'),
  imaginaire: require('../../assets/ui/imaginaire.png'),
  journal: require('../../assets/ui/journal.png'),
  'journal-encre': require('../../assets/ui/journal-encre.png'),
  'lieu-reel': require('../../assets/ui/lieu-reel.png'),
  'lune-crepuscule': require('../../assets/ui/lune-crepuscule.png'),
  'meteo-1': require('../../assets/ui/meteo-1.png'),
  'meteo-2': require('../../assets/ui/meteo-2.png'),
  'meteo-3': require('../../assets/ui/meteo-3.png'),
  'meteo-4': require('../../assets/ui/meteo-4.png'),
  'meteo-5': require('../../assets/ui/meteo-5.png'),
  micro: require('../../assets/ui/micro.png'),
  'micro-bouton': require('../../assets/ui/micro-bouton.png'),
  'micro-encre': require('../../assets/ui/micro-encre.png'),
  musique: require('../../assets/ui/musique.png'),
  personne: require('../../assets/ui/personne.png'),
  reglages: require('../../assets/ui/reglages.png'),
  supprimer: require('../../assets/ui/supprimer.png'),
  telephone: require('../../assets/ui/telephone.png'),
  vehicule: require('../../assets/ui/vehicule.png'),
  video: require('../../assets/ui/video.png'),
};

export type AppIconName = keyof typeof ICONS;

export const REGLETTE = require('../../assets/ui/barre-reglette.png');
export const CURSEUR = require('../../assets/ui/barre-curseur.png');

export function AppIcon(props: { name: AppIconName; size: number; style?: StyleProp<ImageStyle>; dim?: boolean }) {
  return (
    <Image
      source={ICONS[props.name]}
      style={[{ width: props.size, height: props.size, opacity: props.dim ? 0.55 : 1 }, props.style]}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}
