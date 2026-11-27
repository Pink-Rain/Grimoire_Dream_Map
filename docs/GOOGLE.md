# Marche à suivre — comptes Google et le reste

Tout ce que **toi** tu dois faire côté comptes, dans l'ordre. Le code, c'est moi.

| Quoi | Pour quoi | Coût | Quand |
|---|---|---|---|
| Compte GitHub | héberger le code, fabriquer le .exe et l'APK | gratuit | ✅ déjà fait |
| **Google Cloud** (Partie 1) | la synchro PC ↔ téléphone via ton Drive | gratuit, sans carte | **maintenant** |
| **Google Play Console** (Partie 2) | publier sur le Play Store | **25 $ une seule fois** | quand l'app sera presque prête (je te dirai) |

Ce dont tu n'as **pas** besoin : compte Expo, compte Apple, abonnement Google Cloud payant, nom de domaine,
serveur, carte bancaire chez Google Cloud.

Les écrans de Google changent parfois de nom ou de place. Si quelque chose ne correspond pas,
envoie-moi une capture d'écran et je t'indique où cliquer.

---

## Partie 1 — Google Cloud (pour la synchro) — à faire maintenant, ≈ 15 minutes

Utilise le compte Google que tu veux voir « propriétaire » de l'app (ton compte habituel convient).
Ce compte-là n'a rien à voir avec les comptes des gens qui utiliseront l'app : chacun se connectera
avec **son** compte et ses rêves iront dans **son** Drive.

### Étape 1 : créer le projet
1. Va sur **https://console.cloud.google.com** et connecte-toi.
2. Si c'est la première fois : choisis ton pays, accepte les conditions d'utilisation.
   Si Google propose un « essai gratuit » avec carte bancaire : **ignore-le** (ferme le bandeau). On n'en a pas besoin.
3. En haut à gauche, clique sur le **sélecteur de projet** (à côté du logo « Google Cloud »),
   puis **« Nouveau projet »**.
4. Nom du projet : `Grimoire Dream Map`. Laisse « Emplacement » sur « Aucune organisation ». Clique **« Créer »**.
5. Attends quelques secondes, puis vérifie qu'en haut de la page c'est bien **Grimoire Dream Map** qui est sélectionné.

### Étape 2 : activer l'accès à Google Drive
1. Dans la barre de recherche en haut, tape **`Google Drive API`** et ouvre le résultat.
2. Clique **« Activer »**.

### Étape 3 : l'écran de connexion (ce que les gens verront en se connectant)
1. Dans la barre de recherche, tape **`Google Auth Platform`** et ouvre-le
   (parfois appelé « Écran de consentement OAuth »).
2. Clique **« Commencer »** (ou « Get started ») et remplis :
   - **Nom de l'application** : `Grimoire - Dream Map`
   - **Adresse e-mail d'assistance** : ton adresse
   - **Audience** : **« Externe »**
   - **Coordonnées** : ton adresse e-mail
   - Coche l'acceptation du règlement, puis **« Créer »**.
3. N'ajoute **pas** de logo (un logo oblige Google à faire une vérification qui prend des semaines).

### Étape 4 : dire à Google ce que l'app demande (le dossier caché)
1. Menu de gauche de Google Auth Platform : **« Accès aux données »** (Data Access).
2. Clique **« Ajouter ou supprimer des champs d'application »** (Add or remove scopes).
3. Dans le filtre, tape `drive.appdata` et coche la ligne **`.../auth/drive.appdata`**
   (« Afficher, créer et supprimer ses propres données de configuration dans votre Google Drive »).
4. Clique **« Mettre à jour »**, puis **« Enregistrer »** en bas de la page.

> L'app aura accès **uniquement** à son propre dossier caché dans le Drive de la personne.
> Elle ne pourra ni voir ni toucher ses autres fichiers.
> C'est aussi ce qui évite la longue vérification de Google.
> Chaque app de la suite Grimoire aura son propre projet Google Cloud, donc son propre dossier caché.

### Étape 5 : t'ajouter comme « utilisateur test »
On laisse l'app en mode **« Test »** pendant qu'on construit la synchro. (Le bouton « Publier l'application »
est grisé tant que la page Branding n'a pas de page d'accueil ni de politique de confidentialité : c'est normal,
voir « Plus tard » ci-dessous.)
1. Menu de gauche : **« Audience »**.
2. Descends jusqu'à **« Utilisateurs tests »** → **« + Add users »**.
3. Tape **ton adresse Gmail** (celle avec laquelle tu utiliseras l'app) → **« Enregistrer »**.

En mode Test : seules les personnes ajoutées ici (100 max) peuvent se connecter, et il faut se reconnecter
à Google environ une fois par semaine.

### Étape 6 : créer l'identifiant de l'app PC (.exe)
1. Menu de gauche : **« Clients »**, puis **« Créer un client »**.
2. **Type d'application** : **« Application de bureau »** (Desktop app).
3. **Nom** : `Dream Map PC`. Clique **« Créer »**.
4. Une fenêtre affiche un **ID client** (se termine par `.apps.googleusercontent.com`) et un
   **code secret du client**. Clique **« Télécharger le fichier JSON »** pour les garder.

### ✉️ Ce que tu m'envoies à la fin de la Partie 1
- l'**ID client** de « Dream Map PC » ;
- le **code secret du client** de « Dream Map PC ».

> Malgré son nom, ce « code secret » n'est **pas** un mot de passe : pour une application installée sur un
> ordinateur, Google considère qu'il sera visible dans l'app, et il ne donne accès à rien sans que la personne
> se connecte elle-même. Il sera intégré au .exe. Ne m'envoie en revanche **jamais** ton mot de passe Google.

### Plus tard dans Google Cloud (je te dirai quand)
- **Passer « en production »** : je mets en ligne (gratuitement, GitHub Pages) une page d'accueil et une
  politique de confidentialité. Tu colles leurs adresses dans **Branding** (« Page d'accueil de l'application »,
  « Lien vers les règles de confidentialité », et `pink-rain.github.io` dans « Domaines autorisés »), sans logo.
  Puis **Audience → « Publier l'application »**. Fini la reconnexion hebdomadaire et la liste de testeurs.
- **Client « Web »** (version navigateur) : il faut d'abord que la version web soit en ligne (je la mets
  gratuitement sur GitHub Pages), car Google demande son adresse.
- **Client « Android »** : il faut l'« empreinte SHA-1 » de la clé de signature de l'app, qu'on récupère
  dans la Play Console (Partie 2, étape 5).

---

## Partie 2 — Google Play Console (publier sur le Play Store) — plus tard

**Ne paie pas tout de suite.** Mais ne t'y prends pas non plus au dernier moment : la vérification
d'identité peut prendre quelques jours, et Google impose un **test de 14 jours** avant la publication.
Je te dirai quand commencer.

### Étape 1 : créer le compte développeur (25 $, une seule fois)
1. Va sur **https://play.google.com/console/signup** avec ton compte Google.
2. Choisis un compte **« Pour vous-même »** (compte personnel). Pas « organisation » : ça demande des
   papiers d'entreprise (numéro D-U-N-S).
3. Remplis le nom de développeur public (ce qui s'affichera sous l'app sur le Play Store, ex. ton nom ou un pseudo).
4. Paie les **25 $** (carte bancaire). C'est le seul paiement de tout le projet.
5. **Vérification d'identité** : Google demande une pièce d'identité et vérifie ton e-mail et ton numéro
   de téléphone. Ton nom légal reste privé, seul le nom de développeur est public.
6. Google demande aussi de confirmer que tu as **un vrai téléphone Android** : installe l'app
   **« Google Play Console »** sur ton téléphone et connecte-toi avec le même compte quand c'est demandé.

### Étape 2 : trouver des testeurs (obligatoire pour un compte personnel)
- Google exige un **test fermé avec au moins 12 personnes**, qui gardent l'app installée **14 jours de suite**,
  avant d'autoriser la publication pour tout le monde.
- Il te faut donc **12 adresses Gmail** de personnes (amis, famille…) avec un téléphone Android,
  qui acceptent d'installer l'app et de la garder 2 semaines. Commence à les chercher dès maintenant.

### Étape 3 : créer l'app dans la Play Console (je te guiderai écran par écran)
- Nom : Grimoire - Dream Map, langue par défaut : français, type : application, gratuite.
- Questionnaires obligatoires (je te donnerai les réponses) : classification du contenu, public cible,
  **sécurité des données** (« Data safety » : on déclare que les données restent sur l'appareil ou dans le
  Drive de la personne, rien n'est envoyé ailleurs), publicités (non).
- **Politique de confidentialité** : obligatoire. Je l'écris et je la mets en ligne gratuitement sur GitHub Pages ;
  tu n'auras qu'à copier l'adresse.

### Étape 4 : la clé de signature (je m'en occupe, mais tu dois la garder)
- Je fabriquerai une « clé d'envoi » (un fichier) qui prouve que les mises à jour viennent bien de toi.
- Tu devras : la **sauvegarder** (clé USB + ton Drive personnel) et l'ajouter comme « secret » dans GitHub
  (je te montrerai). **Si elle est perdue**, Google permet de la remplacer, mais c'est une démarche pénible.

### Étape 5 : l'empreinte SHA-1 pour la synchro sur Android
- Dans la Play Console : **Test et publication → Intégrité de l'application → Signature d'application**.
- Copie l'empreinte **SHA-1** et envoie-la moi : on crée alors le client « Android » dans Google Cloud.

---

## Récapitulatif de ce que tu m'envoies, au fil du temps
1. Maintenant : ID client + code secret de « Dream Map PC » (Partie 1).
2. Plus tard : l'empreinte SHA-1 (Partie 2, étape 5), les 12 adresses des testeurs (à saisir toi-même dans la Play Console).
