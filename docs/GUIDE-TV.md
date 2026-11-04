# Guide TV automatique

L’application 0.2.0 charge directement `https://xmltvfr.fr/xmltv/xmltv_fr.xml.gz`, le guide France complet publié par [XML TV Fr](https://xmltvfr.fr/). Ce fichier contenait 401 chaînes lors du contrôle du 4 novembre 2026 ; les chaînes et la couverture dépendent du fournisseur. Aucun compte, fichier utilisateur ou serveur de l’application n’est nécessaire. Il s’agit d’horaires et de métadonnées, pas de flux vidéo.

## Fonctionnement

- Téléchargement HTTPS au premier lancement. La réponse CORS de la source autorise les PWA et la WKWebView Capacitor.
- Décompression GZip progressive avec fflate, lecture XML progressive avec sax dans un Worker, validation des horaires et des données avant remplacement du guide.
- Conservation des six dernières heures et des 48 prochaines heures ; seuls les programmes effectivement en cours apparaissent dans « En direct ». « Explorer » masque les programmes terminés.
- Rafraîchissement toutes les six heures lorsque l’application est ouverte, et vérification au retour au premier plan ou de la connexion. Un échec est retenté automatiquement tant que l’application est ouverte. iOS n’est pas sollicité pour télécharger en arrière-plan lorsque l’application est fermée.
- Copie locale IndexedDB après réussite, adaptée à un guide dépassant la limite de localStorage. Si la source ne répond plus, les dernières données restent consultables et leur date est affichée. La première ouverture hors connexion présente un état d’attente ; aucun catalogue fictif ne sert de repli.
- Le bouton « Actualiser » permet de relancer immédiatement une requête. Aucun import manuel n’est proposé. Les anciens catalogues importés ne sont plus utilisés ; les favoris sont conservés.

Les dates XMLTV et leur décalage UTC sont convertis sans ambiguïté, puis affichés dans le fuseau de l’appareil. L’onglet Sport affiche en priorité les matchs et événements en cours ou prévus dans les 48 prochaines heures, en écartant les magazines, conférences et plages d’attente signalés par la source. Le bouton « Tout le sport » permet également de consulter les autres émissions sportives. Les cartes affichent le titre, le sous-titre lorsqu’il précise les équipes ou l’événement, la chaîne et l’horaire. La recherche porte aussi sur le sous-titre et le résumé ; elle n’invente pas d’affectations de droits sportifs absentes du guide. Les longues listes sont affichées par groupes de 80, sans limiter le nombre de chaînes ou de programmes accessibles.

Les identifiants des favoris sont fondés sur la chaîne et l’instant de diffusion, sans changer à chaque téléchargement. Les descriptions absentes sont indiquées comme telles ; les images HTTPS sont affichées lorsqu’elles existent, avec une illustration locale en repli.

## Source et confidentialité

Le site annonce une mise à jour quotidienne de ses fichiers. Le projet ne garantit pas la disponibilité, l’exhaustivité ni l’exactitude de cette source externe. L’attribution « XML TV Fr » reste visible dans l’application.

Les requêtes sont envoyées directement à XML TV Fr et aux hébergeurs d’images indiqués dans le guide ; ces serveurs reçoivent les informations ordinaires d’une connexion HTTPS, notamment l’adresse IP. Aucun compte, favori ou catalogue local n’est envoyé par l’application. Les requêtes du guide omettent les cookies et le référent ; les images omettent le référent. Aucun service d’analyse n’est ajouté.

Le [générateur XML TV Fr](https://github.com/racacax/XML-TV-Fr) est un projet distinct. Sa licence ne confère pas automatiquement des droits de redistribution sur les textes et images des fournisseurs de programmes. Ces contenus ne sont pas incorporés à l’IPA et restent soumis à leurs droits respectifs. Une exploitation commerciale ou une publication publique doit prévoir une source autorisée pour cet usage.

Le fichier de contrôle comportait 401 chaînes et 115 863 entrées sur l’ensemble de sa période. Après sélection de la fenêtre utile, 27 565 programmes dont 3 093 programmes sportifs étaient présents, pour 380 chaînes avec horaires. La différence avec 401 correspond aux chaînes sans horaires dans cette fenêtre. Ces nombres changent avec la source et l’heure. Le fichier compressé faisait environ 9,8 Mo, traité progressivement pour éviter de garder un arbre XML de 78 Mo dans la mémoire de l’interface.
