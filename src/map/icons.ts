/** Catalogue des dessins (game-icons.net, licence CC BY 3.0 : citer la source). */
import { ICONS } from './icons.generated';

export type IconCategory = 'nature' | 'habitat' | 'lieux' | 'vehicules' | 'creatures' | 'objets';

export interface IconDef {
  name: string;
  label: string;
  category: IconCategory;
  keywords: string[];
  kind: 'place' | 'vehicle';
  /** Tracés SVG (viewBox 0 0 512 512), sans couleur imposée. */
  body: string;
}

export const ICON_CATEGORIES: { id: IconCategory; label: string }[] = [
  { id: 'nature', label: 'Nature' },
  { id: 'habitat', label: 'Bâtiments' },
  { id: 'lieux', label: 'Lieux' },
  { id: 'vehicules', label: 'Véhicules' },
  { id: 'creatures', label: 'Créatures' },
  { id: 'objets', label: 'Objets' },
];

export const ALL_ICONS: IconDef[] = ICONS;
const byName = new Map(ICONS.map((i) => [i.name, i]));

export function getIcon(name: string | undefined): IconDef | undefined {
  return name ? byName.get(name) : undefined;
}

/** Tracés du dessin, avec un dessin de secours si le nom est inconnu. */
export function iconBody(name: string | undefined): string {
  return getIcon(name)?.body ?? byName.get('house')?.body ?? '';
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Recherche par mot (français, avec ou sans accents), en priorité au début des mots. */
export function searchIcons(query: string, category?: IconCategory | null, kind?: 'place' | 'vehicle'): IconDef[] {
  const q = normalize(query.trim());
  let list = ALL_ICONS;
  if (category) list = list.filter((i) => i.category === category);
  if (!q) return kind === 'vehicle' && !category ? [...list].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'vehicle' ? -1 : 1)) : list;
  const words = (s: string) => normalize(s).split(/[^a-z0-9]+/).filter(Boolean);
  const scored: { i: IconDef; s: number }[] = [];
  for (const i of list) {
    const label = normalize(i.label);
    const labelWords = words(i.label);
    const kw = i.keywords.map(normalize);
    const kwWords = i.keywords.flatMap(words);
    let s = 0;
    if (label === q || kw.includes(q)) s = 100;
    else if (labelWords.some((w) => w === q)) s = 80;
    else if (labelWords.some((w) => w.startsWith(q))) s = 60;
    else if (kwWords.some((w) => w === q)) s = 50;
    else if (kwWords.some((w) => w.startsWith(q))) s = 30;
    else if (q.length >= 4 && (label.includes(q) || kw.some((k) => k.includes(q)))) s = 10;
    if (s) scored.push({ i, s });
  }
  return scored.sort((a, b) => b.s - a.s || a.i.label.localeCompare(b.i.label)).map((x) => x.i);
}

/** SVG complet d'un dessin, dans la couleur demandée. */
export function iconXml(name: string | undefined, color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g fill="${color}">${iconBody(name)}</g></svg>`;
}
