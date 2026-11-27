# AGENTS.md — Grimoire - Dream Map (journal de rêves)

Fichier de reprise pour l'agent qui code l'app. **À lire en premier, à tenir à jour à chaque étape.**

## Nom

- **Grimoire** = la suite d'applications. **Dream Map** = cette app. Nom complet : **Grimoire - Dream Map**.
- Nom sous l'icône Android : « Dream Map » (un nom long serait coupé). Fenêtre PC, installateur, Play Store :
  « Grimoire - Dream Map ».
- Identifiants techniques : paquet Android / app PC `com.pinkrain.grimoire.dreammap` (modifiable seulement AVANT
  la 1re publication Play Store) ; identifiant des fichiers de données `grimoire-dream-map` ; base IndexedDB
  `grimoire-dream-map` ; dossier Android `dreammap-data` ; adresse interne de l'app PC `app://dreammap/`.
- Chaque app de la suite doit avoir ses propres identifiants et son **propre projet Google Cloud**
  (sinon elles partageraient le même dossier caché Drive).

## La personne et la façon de travailler

- La personne qui porte le projet ne code pas et ne veut pas apprendre la technique. L'agent code tout.
- Toujours choisir ce qui marche le mieux pour l'utilisateur ET ce que l'agent sait coder de façon fiable.
- Avancer **par petites étapes** : une fonctionnalité à la fois, testée, puis la suivante.
- L'agent teste lui-même la version web (navigateur Playwright) et l'app PC (Electron sous xvfb).
  La personne teste le téléphone et dit ce qui ne va pas.
- Expliquer simplement, sans jargon, en français. **Ne rien supposer** : si un point n'est pas clair, demander.
- Interface de l'app en **français**.
- **La personne ne veut pas toucher à GitHub** : l'agent gère tout, y compris les pull requests. Il travaille sur
  sa branche `claude/...`, ouvre une PR vers `main`, et la fusionne lui-même une fois testée (accord explicite).
  Seuls les réglages impossibles à faire par l'agent (secrets, activation de Pages…) sont demandés, pas à pas.
- Dépôt : `Pink-Rain/Grimoire_Dream_Map` (renommé depuis `Grimoire_Dream_Journal`).

## Décisions fixées (ne pas changer sans accord)

- Plateformes : Android (Play Store) + PC. Sur PC : app Windows `.exe` (Electron qui affiche la version web)
  et, plus tard, la version web installable (PWA).
- Technique : Expo (React Native) + TypeScript.
- Budget 0 € : aucun service payant. Seul coût accepté : 25 $ du compte développeur Google Play.
- Pas de serveur à nous. Données **en local** sur l'appareil ; l'app marche sans internet.
- Synchro PC/téléphone **optionnelle** via Google Drive `appDataFolder` (scope `drive.appdata`) du compte
  de la personne. Conflits : pour chaque élément, la version la plus récente (`updatedAt`) gagne.
- Changement de téléphone sans synchro : sauvegarde automatique Android (`allowBackup: true`, < 25 Mo)
  + boutons « Exporter mes données » / « Importer des données ».
- Limites acceptées : sur navigateur, la connexion Google devra parfois être revalidée d'un clic ;
  un même élément modifié sur deux appareils sans synchro entre les deux → une des modifications est perdue.

## Règles du format de données (IMPORTANT, pour la synchro)

Code : `src/data/types.ts`, `src/data/records.ts`, `src/data/store.ts`.

- Chaque élément : `id` (UUID v4), `createdAt`, `updatedAt` (ISO 8601), `deleted` (booléen).
- On ne supprime jamais un élément : `deleted: true` (il reste stocké pour que la suppression se synchronise).
- `SCHEMA_VERSION` (actuellement **1**). On n'**ajoute** que des champs/collections ; **jamais** renommer ni
  supprimer. Augmenter `SCHEMA_VERSION` quand on ajoute quelque chose, et noter l'ajout dans l'historique ci-dessous.
- Les champs inconnus (venant d'une version plus récente de l'app) sont **conservés** : toujours modifier un
  élément par `{...existant, ...changements}` (c'est ce que fait `DataStore.save`).
- Découpage en fichiers (« morceaux ») : un fichier par collection et par **mois de création**
  (`dreams.2026-11`). `createdAt` ne change jamais, donc un élément reste toujours dans le même fichier.
  Le même découpage servira pour les fichiers Drive.
- Contenu d'un fichier : `{ app: "grimoire-dream-map", schemaVersion, collection, shard, records: [...] }`.
- Export : `{ app, kind: "export", schemaVersion, exportedAt, shards: [...] }`. L'import **fusionne**
  (règle « le plus récent gagne »), il ne remplace pas.
- Toute modification passe par `appStore` (`src/data/appStore.ts`) : `save`, `remove`, `importBundle`.

### Historique du format
- v1 : collection `dreams` — `dreamDate` (AAAA-MM-JJ), `title`, `text`.
- v2 : `dreams` + `kind` (quick/full), `lucidity` (0-5|null), `mood` (1-5|null), `ambiances`, `tags`, `colors`
  (#rrggbb, taches d'aquarelle), `peopleIds`, `placeIds`, `media` (MediaItem[]). Nouvelles collections `people`
  (`name`, `real`) et `places` (`name`, `kind` place|vehicle, `real`, `icon`, `size` 1-7, `lat`/`lon`, `address`,
  `relation` {dir, placeId}, `layer`, `route` {fromId, toId}). Les anciens rêves passent par `normalizeDream`.
- v3 : `dreams` + `weather` (ids WEATHERS), `clarity` (1-5|null), `atmosphere` (1-5|null), `timeOfDay` (ids),
  `dreamTypes` (ids), `emotions` (ids) — listes dans src/ui/theme.ts ; les mots libres sont stockés tels quels.
  Nouvelle collection `sleeps` (sommeil, **indépendante des rêves**) : `date` (jour du coucher), `bedTime`,
  `asleepTime`, `wakeTime`, `upTime` (« HH:MM »), `interruptions` [{id, from, to}]. Calculs dans
  src/data/sleep.ts (passage de minuit, siestes 9 h-19 h, rangement au jour du réveil).
  **Ne jamais changer les `id` des listes** (WEATHERS, EMOTIONS…) : ce sont eux qui sont enregistrés.

## Architecture

```
index.ts                  point d'entrée Expo → src/App.tsx
src/App.tsx               navigation (liste / rêve / réglages), mise en page téléphone ou ordinateur
src/data/                 format, règles de fusion, magasin de données (DataStore) + tests (vitest)
src/data/storage/         stockage local : index.ts (Android, fichiers expo-file-system dans
                          Paths.document/dreammap-data/*.json) ; index.web.ts (IndexedDB via idb-keyval)
src/platform/             backup.ts / backup.web.ts (export/import de fichier), dialogs.ts (confirmations),
                          desktop.ts (pont vers l'app PC, window.grimoireDesktop)
src/ui/                   écrans et composants
public/index.html         modèle HTML de la version web (langue fr, fond sombre)
desktop/                  app PC Electron : main.js (fenêtre, schéma app://grimoire, format téléphone),
                          preload.js (pont sécurisé). Sert le dossier dist/ (export web).
.github/workflows/build.yml  fabrique le .exe (Windows) et un APK de test, publiés dans Releases
docs/GOOGLE.md            guide pas à pas des comptes Google / Play (pour la personne)
src/map/                  carte : géométrie (testée), recherche de lieux, dessins, composant DreamMap
scripts/map/              page de la carte (runtime.js, style.css) ; scripts/build-generated.mjs l'assemble
src/sync/                 synchro Drive : drive.ts (API Drive appDataFolder), engine.ts (algorithme, testé
                          avec un faux Drive dans engine.test.ts), syncManager.ts (connexion, quand synchroniser,
                          état affiché dans Réglages)
desktop/google.js         connexion Google de l'app PC (navigateur système + serveur local 127.0.0.1 + PKCE),
                          jeton chiffré (safeStorage) dans userData/google-auth.json, requêtes Drive faites par
                          le processus principal (pas de souci CORS)
site/                     page de présentation (GitHub Pages) + politique de confidentialité ; __VERSION__ et
                          __REPO__ sont remplacés au déploiement
```

- Pas d'Expo Router : navigation simple par état dans `App.tsx` (fiable sur web, Android et Electron).
- Mise en page : « téléphone » (un écran à la fois) si largeur < 720 px ou format téléphone forcé ;
  sinon « ordinateur » (liste à gauche, détail à droite).
- Bouton téléphone/ordinateur (barre du haut) : uniquement sur PC.
  - App PC : redimensionne la fenêtre (412×860) et revient à la taille précédente ; mémorisé dans
    `userData/window-state.json`. Le schéma `app://dreammap/` donne une origine stable (IndexedDB permanent).
  - Navigateur : affiche l'app dans un cadre de téléphone ; mémorisé dans localStorage.
- Enregistrement : en mémoire immédiatement, sur disque 400 ms après (par morceau modifié), et forcé quand
  l'app passe en arrière-plan / se cache / avant fermeture de l'app PC (`onBeforeClose`).
- Éditeur : enregistrement automatique ; un nouveau rêve n'est créé qu'à la première saisie.

## La carte des rêves (cœur de l'app)

- **Pas de fond géographique** (demande explicite de la personne : ne jamais en proposer). Un parchemin vierge bleu
  nuit qui se remplit avec les lieux rêvés. On utilise Leaflet **sans tuiles** (juste pour le zoom / déplacement /
  glisser-déposer) ; les vrais lieux gardent leurs coordonnées réelles (recherche OpenStreetMap : Photon puis
  Nominatim, `src/map/geocode.ts`), les lieux imaginaires ont des coordonnées choisies (« au nord de… » ou glissés).
- Page de la carte = `scripts/map/runtime.js` + `scripts/map/style.css` + Leaflet + police IM Fell English, assemblés
  par `scripts/build-generated.mjs` (lancé par `postinstall`) dans `src/map/mapHtml.generated.ts` (non versionné).
  Affichée dans une iframe (web/PC, `DreamMap.web.tsx`) ou une WebView (Android, `DreamMap.tsx`).
  Messages : app → carte `{type:'state', places, selectedId, view}`, `{type:'focus', id}`, `{type:'fit'}` ;
  carte → app `ready`, `select`, `move`, `view`.
- Taille des dessins : échelle « d'illustrateur » `iconPixels` (même formule dans runtime.js) — la taille 1-7 fixe
  les proportions, le zoom agrandit doucement. Labels visibles à partir de 28 px.
- Taches d'aquarelle sous chaque lieu = couleurs des rêves où il apparaît (`useMapPlaces`), filtre SVG `#wc`.
- Superposition : `layer` (boutons Devant / Derrière de la fiche lieu) puis les petits au-dessus des grands.
- Véhicules : trajet invisible entre deux lieux ; position tirée au hasard sur le trajet à chaque ouverture.
- Dessins : 900 icônes game-icons.net (CC BY 3.0, crédit dans Réglages › À propos), triées dans
  `scripts/icon-catalog.json` (label, catégorie, mots-clés FR). Mots-clés en plus : `EXTRA_KEYWORDS` du générateur.

## Icônes dessinées par la personne (assets/ui, assets/logo-*)

- Série « or rose, émail crépuscule » + logo (globe de constellations). Composant `src/ui/AppIcon.tsx`.
- **Règle : chaque icône dessinée ne sert QU'À son usage prévu** (voir LISEZMOI de la personne). S'il manque une
  icône, utiliser une icône standard Ionicons (la personne dessinera la vraie) — ne jamais réutiliser une icône
  dessinée pour un autre sens. Les « -encre » vont sur les boutons abricot.
- Icône de l'app PC (desktop/icon.png) : logo **transparent** (dream-map-logo-512). Les versions à fond indigo
  (app-icon-*) sont réservées à Android / écrans d'accueil.
- Usages : carte/journal (+ -encre actifs), micro (note rapide), micro-encre (bouton rond abricot note rapide),
  micro-bouton (enregistreur), lune-crepuscule (nouveau rêve), telephone, reglages, boussole (« voir tous les
  lieux » sur la carte), chevrons (date), fermer, supprimer, eclair(-encre) (note rapide), personne, imaginaire,
  lieu-reel, vehicule, image/musique/video/fichier, meteo-1..5 (orage, pluie, nuageux, éclaircies, soleil),
  barre-reglette + barre-curseur (curseur 5 crans `EmojiScale` : humeur, clarté, atmosphère).
- Icônes encore standard (à dessiner par la personne) : sommeil (lit), retour, rêve complet (livre), ajouter (+),
  arrêter/lire/pause un son, format ordinateur, centrer, modifier, devant/derrière, lien/YouTube, ouvrir/partager,
  télécharger, se connecter Google, synchroniser, se déconnecter, exporter/importer, mot-clé, case cochée.

## Formulaires

- Entrée rapide (`kind: 'quick'`) : titre, note(s) vocale(s), quelques détails → bouton « Compléter ce rêve ».
- Rêve complet : récit, médias, lieux (réel / imaginaire / véhicule, réutilisables), personnes (réelles /
  imaginaires, réutilisables, nom seulement), lucidité (phases de lune 0-5), humeur (météo 1-5), ambiance (liste +
  libre), couleurs du rêve (aquarelle), étiquettes. Enregistrement automatique.
- Médias (`src/platform/media*.ts`) : Android → fichiers dans `Paths.document/dreammap-media` (exclu de la
  sauvegarde auto Android par `plugins/withBackupRules.js`, sinon les 25 Mo seraient dépassés) ; web/PC → IndexedDB
  `grimoire-dream-map-media`. **Les fichiers médias ne sont pas encore synchronisés** (seules les infos le sont).
- Statistiques et transcription voix → texte : plus tard (décision de la personne).

## Synchro Google Drive

- Un fichier Drive par morceau local (`dreams.2026-11.json`) dans `appDataFolder`.
- État retenu localement sous le nom `local.sync` : pour chaque morceau, id Drive, md5 Drive et empreinte du contenu.
  On ne télécharge que si le md5 Drive a changé ; on n'envoie que si le contenu fusionné diffère du Drive.
- Doublons de fichiers (deux appareils qui créent en même temps) : fusionnés, on garde le plus ancien.
- Empreinte = `recordsHash` (JSON à clés triées, éléments triés par id) : indépendante de l'ordre et de `schemaVersion`.
- Fichiers Drive inconnus (autres collections, futures versions) : jamais touchés.
- Déclencheurs : démarrage, 5 s après une modification, retour sur l'app, toutes les 5 min, bouton.
- Google Cloud : projet « Grimoire Dream Map ». Client « Dream Map PC » (Application de bureau) :
  ID en clair dans `desktop/google.js` ; **code secret dans le secret GitHub `GOOGLE_DESKTOP_CLIENT_SECRET`**,
  écrit dans `desktop/google-oauth.json` (ignoré par git) au moment de fabriquer le .exe.
  En local : créer `desktop/google-oauth.json` = `{"clientSecret": "..."}` (demander la valeur à la personne).
- Écran de consentement en mode **Test** tant que la page d'accueil + confidentialité ne sont pas renseignées dans
  Branding ; en mode Test, il faut se reconnecter tous les 7 jours (géré : message « connexion expirée »).
- Android et navigateur : pas encore (« arrive bientôt » dans les réglages).

## Commandes

Le réseau de l'environnement de l'agent bloque `api.expo.dev` et `docs.expo.dev` :
- installer un module Expo : `EXPO_OFFLINE=1 npx expo install <paquet>` (versions compatibles du SDK) ;
- doc Expo : lire les types dans `node_modules/<paquet>/build/*.d.ts` (fiable, version exacte).

```bash
npm test                    # tests des données (vitest)
npx tsc --noEmit            # vérification des types
EXPO_OFFLINE=1 npx expo export -p web --output-dir dist   # version web dans dist/
cd desktop && npm install && npx electron .                # app PC (après l'export web)
```

Avant de fusionner dans `main` : refaire les vérifications dans une copie propre (`git ls-files | tar` vers un
dossier du scratchpad, puis `npm ci`, `npx tsc --noEmit`, `npm test`) — le `node_modules` local peut contenir des
paquets en trop (ex. `@types/node`) qui cachent des erreurs. Ne pas utiliser de modules `node:` dans `src/`.

Avant d'envoyer une modification de `.github/workflows/*.yml` : `npx -y @action-validator/cli <fichier>`
(une erreur de syntaxe fait échouer toute la fabrication sans rien lancer).

Tests navigateur / Electron : scripts Playwright à écrire dans le dossier scratchpad (pas dans le dépôt).
Electron sous Linux : `xvfb-run`, `executablePath: desktop/node_modules/electron/dist/electron`.
Si l'Electron n'est pas téléchargé : `ELECTRON_GET_USE_PROXY=1 node desktop/node_modules/electron/install.js`.

## Publier une version (.exe + APK)

1. Augmenter `version` dans `package.json`, `desktop/package.json` ET `app.json` (`expo.version`),
   et `android.versionCode` (+1).
2. Fusionner dans `main` (PR) → GitHub Actions fabrique `Grimoire-Dream-Map-Setup-<version>.exe` et
   `Grimoire-Dream-Map-<version>-test.apk`, les publie dans Releases (tag `v<version>`), puis met à jour la page
   https://pink-rain.github.io/Grimoire_Dream_Map/ (liens de téléchargement vers cette version).
   Sur une branche `claude/...`, mettre `[build]` dans le message du commit pour fabriquer une préversion
   (pas de mise à jour de la page).
- **Mises à jour automatiques** :
  - App PC : `electron-updater` (desktop/main.js) lit les Releases GitHub (dernière release non « préversion »,
    donc celles de `main`), télécharge en arrière-plan, bandeau « Redémarrer » (src/ui/UpdateBanner.tsx), sinon
    installation à la fermeture. Il faut publier `latest.yml` et le `.blockmap` avec l'exe (fait par build.yml).
    Le numéro de version doit augmenter à chaque publication. Fiable à partir de la 0.6.0 (la 0.4.0/0.5.0 avait un
    conflit : la fenêtre retenait sa fermeture pendant que l'installateur démarrait). Ordre correct : enregistrer
    (flushRenderer) → allowClose = true → quitAndInstall(true, true). Journal : userData/update.log (bouton dans
    Réglages › Mises à jour, avec « Rechercher les mises à jour » ; logique partagée dans src/platform/updates.ts).
  - Android hors Play Store : impossible de se mettre à jour en silence ; l'app consulte l'API GitHub
    (`releases/latest`) et propose de télécharger le nouvel APK (Android demande une confirmation).
    Sur le Play Store, les mises à jour seront automatiques.
- L'exe n'est pas signé (signature payante) : Windows affiche « Windows a protégé votre ordinateur »
  → « Informations complémentaires » → « Exécuter quand même ».
- L'APK de test est signé avec une clé de test : il faudra le désinstaller (après export des données)
  avant d'installer la version Play Store.

## Expo SDK 58 — ne pas se fier à sa mémoire

Expo change à chaque version. Avant d'utiliser une API Expo/React Native, vérifier les types installés.
- `expo-file-system` : nouvelle API `File`, `Directory`, `Paths` (pas de `documentDirectory`) ;
  ne fonctionne pas sur web.
- Ne jamais créer/modifier `android/` à la main (généré par `expo prebuild`) : passer par `app.json`.

## État d'avancement

- [x] Étape 1 : base de l'app — journal de rêves minimal (date, titre, texte), stockage local, export/import,
  format téléphone/ordinateur, app PC .exe, APK de test.
- [x] Étape 2 : synchro Google Drive sur l'app PC (v0.2.0) + page de présentation et politique de confidentialité.
- [x] Étape 3 (v0.3.0) : carte parchemin, formulaires rapide/complet, médias, lieux/personnes/véhicules.
- [x] v0.4.0 : mises à jour automatiques (PC) et détection de nouvelle version (Android).
- [x] v0.5.0 : sélecteurs à emojis (humeur, clarté, atmosphère sur la réglette ; météo, jour/nuit, type, émotions),
  sommeil (3e type d'entrée), journal groupé par jour, logo et icônes de la personne.
- [x] v0.6.0 : correctif du redémarrage pour mise à jour, journal des mises à jour, bouton « Rechercher ».
- [ ] Synchro des fichiers médias (notes vocales, images…) dans le Drive.
- [ ] Statistiques (simples et croisées). Transcription voix → texte (facultative).
- [ ] Synchro Google Drive (appDataFolder) : PC (.exe → client OAuth « Application de bureau », redirection
  locale 127.0.0.1 + PKCE, ouverture du navigateur système) ; web (Google Identity Services, client « Web ») ;
  Android (client « Android » + empreinte SHA-1 de la clé de signature).
- [ ] Google Cloud : projet « Grimoire Dream Map » créé, Drive API activée, écran de consentement en mode **Test**
  (la personne s'est ajoutée comme testeur). « Publier l'application » exige dans Branding une page d'accueil +
  une politique de confidentialité → à publier sur GitHub Pages, puis passer en production.
- [ ] Version web hébergée (GitHub Pages, gratuit car dépôt public) + installable (PWA).
- [ ] Publication Play Store (AAB signé, politique de confidentialité).
