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
- v4 : `dreams` + `moodEmoji` (emoji choisi ; `mood` va désormais de 0 à 5, grille MOOD_GRID), `genres`
  (étiquettes), `sleepId` (lien vers le sommeil ; le lien inverse se calcule). `sleeps` + `quality`, `energy`
  (1-5). Liaison auto : un nouveau rêve se lie à la seule nuit (hors sieste) qui finit à sa date.
- v5 : `sleeps` + `factors`, `sleepPlaces` (étiquettes), `wakeMood` (0-5), `wakeMoodEmoji`, `wakeEmotions`
  (étiquettes). `places` + `admin` {district, city, county, state, country} pour les vrais lieux (rempli par
  la recherche ; pour les anciens lieux, deviné depuis `address` par `adminFromAddress`).
- v6 : `places.route.points` ([lat, lon][]) = trajet d'un véhicule dessiné à la main (bouton « Dessiner le trajet »
  de la fiche) ; sans points, la ligne droite entre `fromId` et `toId`. Position : `pointOnPath` (n'importe où sur
  la longueur du trajet, tirée au hasard à chaque ouverture de la carte).

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
- Véhicules : trajet invisible, sauf quand le véhicule est choisi (pointillés cuivre) ou qu'on le dessine (la carte
  envoie `tap` à chaque touche ; `drawing` / `route` dans le message `state`).
- Fiche d'un lieu : boutons icône seule (`Tool` dans MapScreen, nom en info-bulle). Lieux imaginaires : **déplaçables
  seulement après avoir touché « glisser »** (`dragId`, demande de la personne).
- Recherche de lieux : sur téléphone, en-tête `User-Agent` « GrimoireDreamMap » (sinon Photon/Nominatim répondent
  403) ; le message d'erreur donne la raison.
- Regroupement au dézoom (v0.8.0, `declutter` dans runtime.js) : quand des lieux (nom compris) se chevauchent à
  l'écran, on garde le plus gros (lieu choisi d'abord, puis taille, puis `layer`) avec une pastille « ×N » ; les
  autres sont retirés de la carte. Si tous sont réels, le nom devient leur zone commune la plus précise
  (quartier → ville → département → région → pays, même logique que `src/map/cluster.ts`). Clic = zoom pour les
  séparer. Les véhicules ne sont pas regroupés.
- Dessins : 900 icônes game-icons.net (CC BY 3.0, crédit dans Réglages › À propos), triées dans
  `scripts/icon-catalog.json` (label, catégorie, mots-clés FR). Mots-clés en plus : `EXTRA_KEYWORDS` du générateur.
  Pas de dessin « place de ville / village » chez game-icons : « place » trouve fontaine, obélisque, tour de
  l'horloge, banc, réverbère. La personne pourra dessiner sa propre place (silhouette SVG/PNG d'une couleur) :
  il faudra alors permettre des dessins perso sur la carte.

## Icônes dessinées par la personne (assets/ui, assets/logo-*)

- Série « or rose, émail crépuscule » + logo (globe de constellations). Composant `src/ui/AppIcon.tsx`.
- **Règle : chaque icône dessinée ne sert QU'À son usage prévu** (voir LISEZMOI de la personne). S'il manque une
  icône, utiliser une icône standard Ionicons (la personne dessinera la vraie) — ne jamais réutiliser une icône
  dessinée pour un autre sens. Les « -encre » vont sur les boutons abricot.
- Icône de l'app PC (desktop/icon.png) : logo **transparent** (dream-map-logo-512). Les versions à fond indigo
  (app-icon-*) sont réservées à Android / écrans d'accueil.
- Usages (LISEZMOI de la personne, zip n° 3) :
  - En-tête : logo (titre), carte/journal (+ -encre actifs), sommeil, micro (note rapide) / micro-encre (bouton
    abricot), nouveau-reve-b / nouveau-reve-b-encre (nouveau rêve), telephone (passer en vue mobile) / vue-pc
    (revenir en vue PC), reglages-sans-fond, retour.
  - lune-crepuscule = rêve complet (badge de l'éditeur, lune à gauche dans le journal) ; lune-contour = note
    rapide pas encore complétée (lune à gauche dans le journal).
  - Carte : zoom-plus-fin, zoom-moins-fin, recentrer-fin (voir tous les lieux, « Centrer » de la fiche lieu),
    boussole-sans-fond (rose des vents décorative, coin bas gauche).
  - Sommeil : sommeil (lit), coucher, endormissement, reveil, lever.
  - Fiche du rêve : chevrons (date), fermer, supprimer, eclair / eclair-encre (note rapide), micro-bouton
    (enregistreur), personne, imaginaire, lieu-reel, vehicule.
  - Médias : image, musique, video, fichier, lien-b. Lucidité : lucidite-b-0 … -5.
  - Zip n° 4 : clarte-1 … -5 (clarté), humeur-* (une par emoji de MOOD_GRID, `moodImageFor`), meteo-* (une par
    météo de WEATHERS : soleil, soleil-voile, eclaircie, nuage, averse, pluie, neige, orage, orage-pluie, tornade,
    arc-en-ciel), moment-* (aube, journée, crépuscule, nuit : TIME_CHOICES = 4 moments). Les anciennes
    meteo-1 … -5 ne servent plus.
  - Barres à curseur (barre-reglette / barre-curseur) : **retirées à la demande de la personne** (v0.6.3).
    Humeur, clarté, atmosphère = rangées d'emojis à toucher (`EmojiScale`).
- Zip n° 5 (v0.8.1, LISEZMOI de la personne) : ajouter (gros bouton + du téléphone), ajouter-petit (boutons
  « Ajouter… »), retirer (croix des étiquettes / lieux / réveils / médias), coche, completer, modifier, fermer,
  supprimer, voir-plus (chevron des lignes), statistiques (onglet), epingle (résultats de recherche de lieu),
  devant, derriere, glisser, lecture, pause, stop, ouvrir-lien, partager (téléphone), telecharger (PC),
  video-lien (YouTube), image-vide, qualite-1…5, energie-1…5 (dans SLEEP_QUALITY / WAKE_ENERGY), exporter,
  importer, deconnexion, synchroniser, maj-rechercher, maj-telecharger, redemarrer, rapport, nouvelle-version
  (bandeau). « Se connecter avec Google » = logo G officiel (`GoogleG` dans SettingsScreen), pas « connexion »
  (dessinée mais pas encore utilisée).
- Icônes au trait cuivré (`LINE_ICONS` dans AppIcon.tsx) : teintées à l'encre sombre sur les boutons abricot.
- Encore standard : « Dessiner le trajet » (brush), « Retirer le dernier point » (undo), dessin de carte
  « place » (game-icons n'en a pas).

## Journal et pages de lecture (v0.9.0, maquette validée par la personne)

- Journal (`src/ui/Journal.tsx`) : recherche, calendrier (`Calendar.tsx` : mois sur PC, semaine dépliable sur
  téléphone, marques `marque-reve` / `marque-sommeil`, bouton `aujourdhui`), filtres Tout · Rêves · Notes rapides ·
  Sommeils · Lucides, liste groupée par jour (une nuit est rangée au jour du réveil). Le journal montre TOUT
  (rêves, notes rapides, nuits). Filtre et recherche partagés : `journalState.ts` (sert aussi aux flèches).
- PC : 2 zones (gauche 380 px : recherche + calendrier + filtres + liste ; droite : la page, qui remplit la place
  — **pas de trou**). Téléphone : liste plein écran, la page s'ouvre en plein écran.
- Une entrée s'ouvre en **page de lecture** (`DreamPage.tsx`, `SleepPage.tsx`, éléments communs `reading.tsx`) :
  overlay `mode: 'read'`. « Modifier » → formulaire (`mode: 'edit'`) ; « Enregistrer » (SaveBar) → retour à la page.
  Nouvel ajout → formulaire directement.
- Page d'un rêve, **dans l'ordre du formulaire** : date, lune, nuit liée, titre en grand, récit avec une petite
  lettrine cuivrée (pas trop grande), notes vocales et médias (MediaSection `readOnly`), lieux (+ voir-carte),
  personnes, humeur / lucidité / clarté (cases), émotions, météo et moment, étiquettes, genre/type/ambiance,
  couleurs (ColorStain). Sur PC dans le journal : **double page de grimoire** (`Book wide`).
- Toucher un détail ouvre seulement son sélecteur (`DetailSheet` : volet du bas sur téléphone, carte au centre sur
  PC) ; les sélecteurs sont partagés avec le formulaire (`dreamFields.tsx`, `sleepFields.tsx`). Titre et récit :
  modifiables sur place (`InlineText`). Détails vides : invisibles, « + Ajouter un détail ».
- Page d'un sommeil : ruban en grand (`SleepRibbonRow` avec `range`), 4 heures à toucher (horloge), durées, ressenti,
  humeur au réveil, veille et lieu, rêves de cette nuit.
- Pages précédente / suivante : dans l'ordre du temps (`neighbour`), en suivant le filtre du journal.

## Navigation (v0.7.0)

- 4 endroits : Carte, Journal (voir ci-dessus), Sommeil (tracker façon bullet journal, src/ui/SleepTracker.tsx :
  une ligne par jour de midi à midi, barres calculées par `trackerSegments` dans src/data/sleep.ts),
  Statistiques (page prête, vide : `StatsScreen`).
- Téléphone : barre du bas Carte · Journal · [+] · Sommeil · Statistiques ; le + ouvre `AddMenu`
  (note rapide, rêve, sommeil). PC : onglets en haut + boutons Sommeil / Note rapide / Nouveau rêve.
- Formulaire du rêve : **pas de phrases d'aide** (demande de la personne), sections compactes, ordre : récit,
  médias, lieux, personnes, humeur et émotions, lucidité et clarté, météo et moment (petits emojis, météos
  WEATHER_CHOICES), étiquettes, genre/type/ambiance (étiquettes), couleurs (à la fin).
- Tout ce qui est « étiquette » : WordPicker (Entrée, propositions pendant la frappe, plusieurs choix).

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

- **Page de présentation** (`site/`, GitHub Pages) : même direction artistique que l'app (polices de l'app en woff2
  allégées dans `site/fonts/`, captures en webp dans `site/img/` faites avec un journal de démonstration). Un
  changement de la page seule est mis en ligne par `.github/workflows/site.yml` (build.yml l'ignore) ; chaque
  version de l'app la remet aussi en ligne (job `pages` de build.yml).

- **Mises à jour sans réinstaller (v0.9.0)** :
  - PC : chaque version publie aussi `web-<version>.gz` + `web-update.json` (`scripts/pack-web.mjs`). L'app PC
    (desktop/main.js, `checkAll`) cherche d'abord cette mise à jour légère, la télécharge dans
    `userData/web-live/<version>`, vérifie l'empreinte, puis « Mettre à jour » recharge simplement la fenêtre
    (même origine app://dreammap → données intactes). L'installateur complet (electron-updater) ne sert que si
    la version demande une coque plus récente : **augmenter `dreamMapShell` dans desktop/package.json à chaque
    changement de main.js / preload.js / google.js dont l'app a besoin.** Test local : variable
    `DREAMMAP_TEST_UPDATES=<adresse>`.
  - Android : « Mettre à jour » télécharge l'APK dans le cache de l'app (`src/platform/apk.android.ts`,
    expo-file-system/legacy) puis ouvre l'installation Android (expo-intent-launcher, permission
    REQUEST_INSTALL_PACKAGES) ; les APK sont effacés au lancement suivant. Plus tard : mises à jour « éclair »
    via EAS Update (demande de la personne, à faire un jour).

- `make_latest` : seule la version de `main` est marquée « dernière » (l'app Android lit `releases/latest`).
  Une fabrication de test sur une branche (commit avec `[build]` ou lancement manuel) crée une pré-version.

1. Augmenter `version` dans `package.json`, `desktop/package.json` ET `app.json` (`expo.version`),
   et `android.versionCode` (+1). **Ajouter l'entrée de la version en haut de `src/data/changelog.json`**
   (phrases simples, sans jargon ; un test le vérifie). L'app n'affiche QUE les 3 dernières (demande de la
   personne) ; l'historique complet est sur la page GitHub `nouveautes.html` (scripts/build-site.mjs).
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
- [x] v0.6.1 : icône PC transparente. v0.6.2 : 22 nouvelles icônes de la personne (zip n° 3).
- [x] v0.6.3 : barres retirées ; émotions et type de rêve = étiquettes réutilisables (WordPicker : Entrée crée
  l'étiquette, propositions seulement pendant la frappe, tirées des étiquettes déjà utilisées + liste de départ ;
  les anciens identifiants comme « peur » s'affichent avec leur libellé) ; clarté sous la lucidité.
- [x] v0.6.4 : journal des mises à jour dans les Réglages (3 dernières versions, les autres à la demande).
- [x] v0.6.5 : app = 3 dernières versions seulement ; historique complet sur la page « Toutes les nouveautés ».
- [x] v0.7.0 : tracker de sommeil, lien rêves ↔ sommeil, qualité/énergie, formulaire compact, 4 onglets + menu +.
- [x] v0.9.1 : recherche de lieux sur téléphone (User-Agent), trajets dessinés (format v6), boutons icône seule,
  bouton « glisser ». Première mise à jour légère PC (coque inchangée : dreamMapShell 1).
- [ ] Statistiques : en réflexion avec la personne (Rêves, Sommeil, Croisées, Lieux, Personnes ; atlas de graphes).
- [x] v0.9.0 : nouveau journal (calendrier, filtres, tout), pages de lecture (double page PC, sélecteurs sur
  place), barre Enregistrer, mises à jour sans réinstaller (PC léger, Android dans l'app), icônes série 2.
- [ ] Mises à jour « éclair » Android (EAS Update) — la personne le veut à terme.
- [x] v0.8.3 : synchro Android. Connexion Google native (`@react-native-google-signin/google-signin`, API
  « originale », sans Firebase : **pas de plugin dans app.json**, l'autolinking suffit), fichiers
  `src/sync/nativeAuth.android.ts` (connexion, jeton, 401 → nouveau jeton) / `nativeAuth.ts` (web, PC : rien).
  Google reconnaît l'app par un client OAuth **Android** dans Google Cloud : paquet
  `com.pinkrain.grimoire.dreammap` + SHA-1 de la clé qui signe l'APK. L'APK de test est signé par la clé de
  debug du modèle Expo (SHA-1 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25) : **ne pas la
  changer** (les téléphones ne pourraient plus mettre à jour sans désinstaller). Pour le Play Store, ajouter un
  2e client Android avec le SHA-1 de la clé « Play App Signing ». Erreur 10 / DEVELOPER_ERROR = client Android
  absent ou mauvaise empreinte.
- [x] v0.8.2 : zip n° 6 (humeurs désaturées, sommeil-encre, statistiques-encre = onglet actif), taches de la
  carte plus grandes, résumé du journal = ColorStain + humeur + lucidité + clarté (dans cet ordre, demande de
  la personne), libellés MOOD_GRID : Horrible, Mauvaise, Mitigé, Okay, Bien, Excellente.
- [x] v0.8.1 : icônes zip n° 5 partout, tracker redessiné (src/ui/SleepRibbon.tsx : ruban dégradé nuit → aube
  pour le sommeil ; **un seul ruban continu du coucher au lever, vide quand on est éveillé** (avant, pendant, après) — demande de la
  personne), date du coucher auto après minuit (`autoSleepDate`).
- [x] v0.8.0 : icônes zip n° 4, 4 moments, horloge (src/ui/TimePicker.tsx), réveils ±5 min auto
  (`completeInterruption`), facteurs / lieu / humeur au réveil, regroupement des lieux au dézoom.
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
