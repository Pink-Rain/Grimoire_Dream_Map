// Génère la page « Toutes les nouveautés » du site (nouveautes.html) à partir de src/data/changelog.json.
// Utilisation : node scripts/build-site.mjs <dossier du site>   (lancé par .github/workflows/build.yml)
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.argv[2] || path.join(root, 'site'));
const changelog = JSON.parse(readFileSync(path.join(root, 'src/data/changelog.json'), 'utf8'));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const longDate = (d) => {
  const [y, m, day] = d.split('-').map(Number);
  return `${day} ${MONTHS[m - 1]} ${y}`;
};

const entries = changelog
  .map(
    (e) => `      <article class="release">
        <h2>Version ${esc(e.version)} <span>${esc(longDate(e.date))}</span></h2>
        <ul>
${e.changes.map((c) => `          <li>${esc(c)}</li>`).join('\n')}
        </ul>
      </article>`,
  )
  .join('\n');

const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Nouveautés — Grimoire - Dream Map</title>
    <meta name="theme-color" content="#100e22" />
    <link rel="icon" href="favicon.png" />
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <div class="sky" aria-hidden="true"></div>
    <main class="wrap doc">
      <a class="back" href="./">← Grimoire - Dream Map</a>
      <h1>Toutes les nouveautés</h1>
      <p>L’historique complet des versions de Dream Map, de la plus récente à la plus ancienne.</p>
${entries}
      <footer>
        <span>Grimoire - Dream Map</span>
        <a href="./">Accueil</a>
      </footer>
    </main>
  </body>
</html>
`;

writeFileSync(path.join(out, 'nouveautes.html'), html);
console.log(`nouveautes.html : ${changelog.length} versions`);
