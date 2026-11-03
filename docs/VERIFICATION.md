# État des vérifications — 3 novembre 2026

## Réalisé sous Windows

- Installation des dépendances avec verrouillage des versions : Capacitor 8.6.0 et Vite 8.3.5 ; Node.js 24.14.0 utilisé localement.
- Compilation de production de la PWA et génération du cache hors connexion.
- Création du projet natif avec le modèle officiel Capacitor SPM, puis synchronisation des ressources web dans `ios/App/App/public/`.
- Contrôle de la structure Xcode, du schéma partagé App, du Bundle ID et de la cohérence de la configuration embarquée.
- Contrôle de l’icône iOS : PNG RGB sans canal alpha, 1024 × 1024.
- Quatre tests JavaScript : limites horaires, recherche et favoris, validation de catalogue, échappement des données importées.
- Quatre tests Python : profil Ad Hoc et App Store, rejet des profils expirés ou incompatibles, profil de développement et App ID générique.
- Analyse de syntaxe YAML des deux workflows, XML des storyboards et du schéma, plist iOS et scripts shell.

Dans Chrome, avec une largeur mobile de 393 px : recherche sans accents, ouverture d’une fiche, ajout aux favoris, changement d’onglet et import d’un catalogue de huit entrées. Un titre contenant du HTML est affiché comme du texte, sans exécution. Vérification d’absence de débordement horizontal sur mobile et à 1440 px ; activation du mode de grands caractères.

Le test hors connexion a été effectué en arrêtant réellement le serveur local après activation du service worker, puis en rechargeant la page. Le catalogue et ses cinq entrées initialement en cours se chargent depuis le cache, tandis qu’une requête non mise en cache échoue. Ce test a permis de corriger la prise en compte de l’en-tête `Vary: Origin` pour les modules JavaScript préchargés dans le cache.

L’audit des dépendances de production ne signale aucune vulnérabilité au moment du contrôle. L’audit complet remonte quatre alertes modérées dans la chaîne de dépendances de développement du CLI Capacitor (`rimraf`, `glob`, `minimatch`). Elles restent à suivre lors des mises à jour du CLI ; les versions n’ont pas été rétrogradées ou forcées vers des majeures incompatibles pour masquer les alertes.

## Compilation macOS validée

Le workflow `ios-check.yml` a réussi sur macOS avec **Xcode 26.3**, sans certificat, le **3 novembre 2026** : [exécution 41661418270](https://github.com/akaRukasu/L-affiche/actions/runs/41661418270), commit `83b3f4fabba58b680460ee28b70087322fb1fa2a`. La préparation web, les huit tests, la résolution des dépendances Swift Package Manager, la compilation Swift et des ressources Xcode ainsi que l’envoi de l’artefact ont réussi. Le journal Xcode confirme `BUILD SUCCEEDED`.

L’artefact `A-LAFFICHE-simulateur-1` a été téléchargé et inspecté. Son ZIP contient `App.app`, son exécutable et son `Info.plist`, avec le Bundle ID `fr.alaffiche.app`, la plateforme `iPhoneSimulator`, le minimum iOS 15.4 et Xcode 26.3. Ce fichier est destiné au simulateur sur Mac ; ce n’est pas une IPA pour iPhone. La durée de rétention configurée sur GitHub est de sept jours.

## Signature et rendu restant à vérifier

Les tests de profil utilisent des données fictives. Aucun certificat, aucune clé privée ni aucun profil réel n’a été fourni. L’import dans Trousseaux d’accès, l’archive pour iPhone, l’export et la vérification d’une IPA restent à valider dans le workflow signé avec vos secrets Apple. Le certificat est comparé aux empreintes des certificats du profil avant l’archive ; les vérifications de signature de l’IPA sont prévues après export, sans garantie d’acceptation par Apple ou l’appareil.

La conformité visuelle native demande encore un essai sur simulateur puis sur iPhone : navigation à grands titres, changement d’onglets, recherche et clavier, import JSON, rotation, VoiceOver, grandes tailles de texte et persistance après relance.

## Provenance

La conversation source décrit la PWA mais son ZIP n’était pas disponible. La structure de ce projet reconstruit a été inspectée ; celle de l’archive d’origine ne peut pas être certifiée. Les images de catalogue sont des illustrations CSS et les programmes sont fictifs. Aucun fournisseur EPG réel n’est configuré.
