// Génère deux fichiers à partir des sources (lancé automatiquement après « npm install ») :
// - src/map/mapHtml.generated.ts : la page de la carte (Leaflet + moteur + style + police), en un seul texte ;
// - src/map/icons.generated.ts   : les dessins game-icons retenus (scripts/icon-catalog.json), avec leurs tracés.
// Ces fichiers ne sont pas dans git (voir .gitignore).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'package.json'));
const read = (p) => readFileSync(p, 'utf8');

// ---------------------------------------------------------------- Dessins
const iconSet = JSON.parse(read(require.resolve('@iconify-json/game-icons/icons.json')));
const catalogPath = path.join(root, 'scripts/icon-catalog.json');
const catalog = existsSync(catalogPath) ? JSON.parse(read(catalogPath)) : [];

// Dessins utilisés par défaut dans le code (src/map/geometry.ts, formulaires) : toujours présents.
const REQUIRED = [
  ['village', 'Village', 'habitat', 'place'],
  ['modern-city', 'Ville', 'habitat', 'place'],
  ['huts-village', 'Hameau', 'habitat', 'place'],
  ['house', 'Maison', 'habitat', 'place'],
  ['wood-cabin', 'Cabane en bois', 'habitat', 'place'],
  ['castle', 'Château', 'habitat', 'place'],
  ['church', 'Église', 'habitat', 'place'],
  ['lighthouse', 'Phare', 'habitat', 'place'],
  ['hospital', 'Hôpital', 'habitat', 'place'],
  ['school-bag', 'École', 'objets', 'place'],
  ['palm-tree', 'Palmier', 'nature', 'place'],
  ['island', 'Île', 'nature', 'place'],
  ['mountaintop', 'Sommet', 'nature', 'place'],
  ['mountains', 'Montagnes', 'nature', 'place'],
  ['forest', 'Forêt', 'nature', 'place'],
  ['pine-tree', 'Sapin', 'nature', 'place'],
  ['waves', 'Vagues', 'nature', 'place'],
  ['river', 'Rivière', 'nature', 'place'],
  ['road', 'Route', 'lieux', 'place'],
  ['flag-objective', 'Drapeau', 'lieux', 'place'],
  ['subway-train', 'Métro', 'vehicules', 'vehicle'],
  ['sailboat', 'Voilier', 'vehicules', 'vehicle'],
  ['car-key', 'Voiture', 'vehicules', 'vehicle'],
];
// Mots-clés en plus pour des recherches courantes sans dessin dédié.
const EXTRA_KEYWORDS = {
  'lily-pads': ['lac', 'mare', 'étang', 'eau'],
  waves: ['lac', 'mer', 'océan', 'eau'],
  'big-wave': ['mer', 'océan', 'tsunami'],
  'wave-crest': ['mer', 'océan', 'plage'],
  island: ['plage', 'mer'],
  'palm-tree': ['plage', 'tropiques'],
  'sand-castle': ['plage', 'sable'],
  'beach-bucket': ['plage', 'sable'],
  river: ['eau', 'fleuve', 'ruisseau'],
  'modern-city': ['ville', 'gratte-ciel', 'immeuble', 'métropole'],
  'subway-train': ['train', 'métro', 'gare', 'tgv'],
  'boat-fishing': ['lac', 'pêche'],
};
const byName = new Map(catalog.map((c) => [c.name, c]));
for (const [name, label, category, kind] of REQUIRED) {
  if (!byName.has(name) && iconSet.icons[name]) byName.set(name, { name, label, category, keywords: [label.toLowerCase()], kind });
}
for (const [name, extra] of Object.entries(EXTRA_KEYWORDS)) {
  const c = byName.get(name);
  if (c) c.keywords = [...new Set([...c.keywords, ...extra])];
}
const icons = [...byName.values()]
  .filter((c) => iconSet.icons[c.name])
  .map((c) => ({ ...c, body: iconSet.icons[c.name].body.replace(/fill="currentColor"/g, '') }));
writeFileSync(
  path.join(root, 'src/map/icons.generated.ts'),
  `// Généré par scripts/build-generated.mjs — ne pas modifier.\n` +
    `// Dessins : game-icons.net (CC BY 3.0), voir l'écran « À propos ».\n` +
    `import type { IconDef } from './icons';\n` +
    `export const ICONS: IconDef[] = ${JSON.stringify(icons)};\n`,
);

// ---------------------------------------------------------------- Page de la carte
const leafletJs = read(require.resolve('leaflet/dist/leaflet.js'));
const leafletCss = read(require.resolve('leaflet/dist/leaflet.css'));
const runtime = read(path.join(root, 'scripts/map/runtime.js'));
const style = read(path.join(root, 'scripts/map/style.css'));
const font = readFileSync(require.resolve('@expo-google-fonts/im-fell-english/400Regular/IMFellEnglish_400Regular.ttf')).toString('base64');

const boussole = readFileSync(path.join(root, 'assets/ui/boussole-256.png')).toString('base64');
const compass = `<svg id="compass" viewBox="0 0 100 100" aria-hidden="true">
<g fill="none" stroke="#b8955c" stroke-width="1"><circle cx="50" cy="50" r="38" stroke-opacity=".6"/><circle cx="50" cy="50" r="33" stroke-opacity=".35" stroke-dasharray="1 3"/></g>
<g stroke="#b8955c" stroke-width=".8" stroke-opacity=".9">
<path d="M50 8 L56 50 L50 92 L44 50 Z" fill="#b8955c" fill-opacity=".25"/><path d="M8 50 L50 44 L92 50 L50 56 Z" fill="#b8955c" fill-opacity=".15"/>
<path d="M50 8 L56 50 L50 50 Z" fill="#d2a64b"/><path d="M50 92 L44 50 L50 50 Z" fill="#d2a64b" fill-opacity=".6"/></g>
<text x="50" y="7" text-anchor="middle" font-family="IM Fell English, Georgia, serif" font-size="11" fill="#d2a64b">N</text></svg>`;

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>@font-face{font-family:'IM Fell English';src:url(data:font/ttf;base64,${font}) format('truetype');font-display:block}
${leafletCss}
${style}</style></head><body>
<div id="map"></div><div id="vignette"></div>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<filter id="wc" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="7" result="n"/>
<feDisplacementMap in="SourceGraphic" in2="n" scale="22" xChannelSelector="R" yChannelSelector="G" result="d"/>
<feGaussianBlur in="d" stdDeviation="2.6"/></filter></defs></svg>
${compass}
<div id="controls"><button id="zin" type="button" aria-label="Zoomer">+</button><button id="zout" type="button" aria-label="Dézoomer">−</button><button id="zfit" type="button" aria-label="Voir tous les lieux"><img alt="" src="data:image/png;base64,${boussole}"></button></div>
<div id="empty"><div>Ta carte est encore vierge.<em>Elle se dessinera au fil de tes rêves.</em></div></div>
<script>${leafletJs.replace(/<\/script/gi, '<\\/script')}</script>
<script>${runtime.replace(/<\/script/gi, '<\\/script')}</script>
</body></html>`;

writeFileSync(
  path.join(root, 'src/map/mapHtml.generated.ts'),
  `// Généré par scripts/build-generated.mjs — ne pas modifier.\nexport const MAP_HTML: string = ${JSON.stringify(html)};\n`,
);

console.log(`Carte générée (${Math.round(html.length / 1024)} ko), ${icons.length} dessins.`);
