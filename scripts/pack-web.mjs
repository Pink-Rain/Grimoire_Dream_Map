// Prépare la mise à jour légère de l'app PC (sans installateur) à partir de dist/ :
// - web-<version>.gz : tous les fichiers de la version web, en un seul fichier compressé ;
// - web-update.json : version, n° de coque PC nécessaire, nom et empreinte du fichier.
// Lancé par la fabrication (GitHub Actions), publié avec chaque version. Voir desktop/main.js.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.resolve(root, process.argv[2] ?? 'dist');
const outDir = path.resolve(root, process.argv[3] ?? '.');
const version = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const shell = JSON.parse(readFileSync(path.join(root, 'desktop/package.json'), 'utf8')).dreamMapShell ?? 1;

const files = {};
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else files[path.relative(dist, full).split(path.sep).join('/')] = readFileSync(full).toString('base64');
  }
})(dist);
if (!files['index.html']) throw new Error('dist/index.html manquant');

const gz = gzipSync(Buffer.from(JSON.stringify({ version, files })), { level: 9 });
const file = `web-${version}.gz`;
writeFileSync(path.join(outDir, file), gz);
const manifest = { version, shell, file, sha256: createHash('sha256').update(gz).digest('hex'), size: gz.length };
writeFileSync(path.join(outDir, 'web-update.json'), JSON.stringify(manifest, null, 2));
console.log(`Mise à jour légère : ${file} (${Math.round(gz.length / 1024)} ko, ${Object.keys(files).length} fichiers, coque ${shell})`);
