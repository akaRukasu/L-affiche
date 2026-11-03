# Vérification — À L’AFFICHE 0.1.1

## Cause identifiée et correction

Le rapport de fermeture sur iPhone indique un arrêt par `DYLD` avant le lancement du code de l’application. La bibliothèque `@rpath/Capacitor.framework/Capacitor` est présente, mais sa signature est rejetée (`code signature invalid`). Ce n’est donc pas une absence du fichier dans le ZIP.

La version 0.1.1 remplace les frameworks binaires dynamiques de Swift Package Manager par les mêmes sources Capacitor 8.6.0 intégrées statiquement avec CocoaPods. Le code UIKit, le catalogue et le Bundle ID sont conservés. Les ressources du pont JavaScript sont copiées dans le bundle principal. Le projet s’ouvre maintenant avec `ios/App/App.xcworkspace` après `npm run ios:sync` sur Mac.

Le correctif enlève la nécessité de signer séparément les frameworks Capacitor et Cordova. **La signature et le provisionnement valides de l’application principale restent nécessaires avant installation sur un iPhone.** Le rapport fourni n’a pas été ajouté au dépôt ; aucun identifiant propre à l’appareil n’est publié.

## IPA iPhone contrôlée

La [compilation iPhone 41688472565](https://github.com/akaRukasu/L-affiche/actions/runs/41688472565) a réussi sur macOS avec Xcode 26.3, en Release pour `generic/platform=iOS`, commit `b125afc58c659ba427e5ff3ad25a2caa20cae173`.

Le fichier `A-LAFFICHE-0.1.1-NON-SIGNEE.ipa` téléchargé a été vérifié à nouveau localement :

- structure `Payload/App.app` et exécutable Mach-O arm64 ciblant iOS ;
- Bundle ID `fr.alaffiche.app`, version 0.1.1, minimum iOS 15.4 ;
- aucun framework embarqué dans `App.app/Frameworks` ;
- aucune dépendance dynamique à Capacitor ou Cordova dans les commandes de chargement du binaire ;
- ressource `native-bridge.js` présente dans le bundle principal ;
- aucun profil ni signature Apple de distribution valide fourni dans l’artefact non signé.

Le contrôleur d’IPA rejette désormais une réintroduction des dépendances dynamiques ou l’absence du pont JavaScript. Quatre tests JavaScript et dix tests Python passent.

## Lancement et affichage vérifiés

Les deux essais Release de [l’exécution 41688472544](https://github.com/akaRukasu/L-affiche/actions/runs/41688472544) ont réussi :

- iOS 26.2 sur iPhone 17 Pro simulé, avec Xcode 26.3 ;
- iOS 27.1 sur iPhone Duo simulé, avec Xcode 27.1.

Le processus reste actif après quinze secondes et les captures montrent le catalogue avec les commandes UIKit sur les deux versions. Le modèle iPhone 13 Pro n’est pas proposé par les runtimes utilisés ; ces essais ne remplacent donc pas la vérification sur cet appareil réel après signature avec l’outil choisi par son propriétaire.

La configuration Debug de la cible App laisse CocoaPods installer son fichier de configuration. Le drapeau `CAPACITOR_DEBUG` reste défini au niveau du projet. Cela évite un contrôle de Podfile.lock exécuté sans les chemins de dépendances. La [compilation Debug 41690047385](https://github.com/akaRukasu/L-affiche/actions/runs/41690047385) a réussi après cet ajustement.

## Limites du produit

Le catalogue reste une démonstration avec huit programmes fictifs et un import JSON. Aucun EPG actualisé ni flux TV n’est connecté. La PWA d’origine a été reconstruite à partir de sa description, car son archive historique n’était pas accessible. Les tests ne constituent ni une distribution Apple signée ni une validation App Store.
