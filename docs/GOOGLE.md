# Configuration Google — guide pas à pas

Ce guide sert à préparer la **synchronisation PC ↔ téléphone** via ton Google Drive.
Tout est **gratuit** : aucune carte bancaire n'est demandée pour ces étapes.
(Si Google te demande une carte quelque part, arrête-toi et dis-le-moi : ce n'est pas normal pour ce qu'on fait.)

Les écrans de Google changent parfois de nom ou de place. Si quelque chose ne correspond pas,
envoie-moi une capture d'écran et je t'indique où cliquer.

---

## Partie 1 — À faire maintenant (≈ 15 minutes)

### Étape 1 : créer le projet
1. Va sur **https://console.cloud.google.com** et connecte-toi avec ton compte Google.
2. Si c'est la première fois : accepte les conditions d'utilisation.
3. En haut à gauche, clique sur le **sélecteur de projet** (à côté du logo « Google Cloud »),
   puis **« Nouveau projet »**.
4. Nom du projet : `Grimoire`. Laisse « Organisation » sur « Aucune organisation ». Clique **« Créer »**.
5. Attends quelques secondes, puis vérifie qu'en haut de la page c'est bien le projet **Grimoire** qui est sélectionné.

### Étape 2 : activer l'accès à Google Drive
1. Dans la barre de recherche en haut, tape **`Google Drive API`** et ouvre le résultat.
2. Clique **« Activer »**.

### Étape 3 : l'écran de connexion (ce que les gens verront en se connectant)
1. Dans la barre de recherche, tape **`Google Auth Platform`** et ouvre-le
   (parfois appelé « Écran de consentement OAuth »).
2. Clique **« Commencer »** (ou « Get started ») et remplis :
   - **Nom de l'application** : `Grimoire`
   - **Adresse e-mail d'assistance** : ton adresse
   - **Audience** : choisis **« Externe »**
   - **Coordonnées** : ton adresse e-mail
   - Coche l'acceptation du règlement, puis **« Créer »**.
3. N'ajoute **pas** de logo (un logo oblige Google à faire une vérification qui prend des semaines).

### Étape 4 : dire à Google ce que l'app demande (le dossier caché)
1. Dans le menu de gauche de Google Auth Platform : **« Accès aux données »** (Data Access).
2. Clique **« Ajouter ou supprimer des champs d'application »** (Add or remove scopes).
3. Dans le filtre, tape `drive.appdata` et coche la ligne
   **`.../auth/drive.appdata`** (« Afficher, créer et supprimer ses propres données de configuration dans votre Google Drive »).
4. Clique **« Mettre à jour »**, puis **« Enregistrer »** en bas de la page.

> Pourquoi seulement ça : l'app aura accès **uniquement** à son propre dossier caché dans ton Drive.
> Elle ne pourra ni voir ni toucher tes autres fichiers. C'est aussi ce qui évite la longue vérification de Google.

### Étape 5 : passer l'app « en production »
1. Menu de gauche : **« Audience »**.
2. Sous « État de publication », clique **« Publier l'application »** puis confirme.
   - Sans ça, Google déconnecte tout le monde au bout de 7 jours, et seules des personnes ajoutées à la main peuvent se connecter.
   - Comme l'app ne demande que le dossier caché, Google ne devrait pas exiger de vérification.
     S'il affiche « Vérification requise », envoie-moi une capture.

### Étape 6 : créer l'identifiant de l'app PC (.exe)
1. Menu de gauche : **« Clients »**, puis **« Créer un client »**.
2. **Type d'application** : **« Application de bureau »** (Desktop app).
3. **Nom** : `Grimoire PC`. Clique **« Créer »**.
4. Une fenêtre affiche un **ID client** (se termine par `.apps.googleusercontent.com`) et un **code secret du client**.
   Clique **« Télécharger le fichier JSON »** pour les garder.

### Ce que tu m'envoies
Envoie-moi dans la conversation :
- l'**ID client** de « Grimoire PC » ;
- le **code secret du client** de « Grimoire PC ».

> Malgré son nom, ce « code secret » n'est **pas** un mot de passe : pour une application installée sur un
> ordinateur, Google sait qu'il sera visible dans l'app, et il ne donne accès à rien sans que la personne
> se connecte elle-même. Il sera intégré dans le .exe. Ne m'envoie en revanche **jamais** ton mot de passe Google.

---

## Partie 2 — Plus tard (je te dirai quand)

- **Client « Web »** : pour la version navigateur. Il faut d'abord que la version web soit en ligne
  (je m'en occupe, gratuitement, sur GitHub Pages), car Google demande son adresse.
- **Client « Android »** : pour le téléphone. Il faut l'« empreinte SHA-1 » de la clé qui signe l'app ;
  on l'aura au moment de préparer la publication sur le Play Store.
