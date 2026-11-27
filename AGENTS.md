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
docs/GOOGLE.md            guide pas à pas pour la configuration Google (pour la personne)
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

Tests navigateur / Electron : scripts Playwright à écrire dans le dossier scratchpad (pas dans le dépôt).
Electron sous Linux : `xvfb-run`, `executablePath: desktop/node_modules/electron/dist/electron`.
Si l'Electron n'est pas téléchargé : `ELECTRON_GET_USE_PROXY=1 node desktop/node_modules/electron/install.js`.

## Publier une version (.exe + APK)

1. Augmenter `version` dans `package.json` ET `app.json` (`expo.version`), et `android.versionCode` (+1).
2. Committer avec `[build]` dans le message → GitHub Actions fabrique `Grimoire-Dream-Map-Setup-<version>.exe`
   et `Grimoire-Dream-Map-<version>-test.apk`, publiés dans Releases (tag `v<version>`).
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
- [ ] Étape suivante à décider avec la personne (contenu du journal, puis synchro Google).
- [ ] Synchro Google Drive (appDataFolder) : PC (.exe → client OAuth « Application de bureau », redirection
  locale 127.0.0.1 + PKCE, ouverture du navigateur système) ; web (Google Identity Services, client « Web ») ;
  Android (client « Android » + empreinte SHA-1 de la clé de signature).
- [ ] Google Cloud : projet « Grimoire Dream Map » créé, Drive API activée, écran de consentement en mode **Test**
  (la personne s'est ajoutée comme testeur). « Publier l'application » exige dans Branding une page d'accueil +
  une politique de confidentialité → à publier sur GitHub Pages, puis passer en production.
- [ ] Le dépôt doit être renommé `Grimoire_Dream_Map` par la personne (Settings → Repository name).
- [ ] Version web hébergée (GitHub Pages, gratuit car dépôt public) + installable (PWA).
- [ ] Publication Play Store (AAB signé, politique de confidentialité).
