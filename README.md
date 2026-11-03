# À L’AFFICHE — iOS et PWA

**Reconstruction du 3 novembre 2026.** L’archive `a-laffiche-pwa.zip` de la conversation précédente n’était pas accessible. Ce projet reprend sa description ; ce n’est pas une conversion vérifiée de ses fichiers d’origine. Le catalogue fourni contient huit programmes fictifs et ne constitue pas un guide TV actualisé.

Le projet contient une PWA fonctionnelle et une application iOS hybride : **navigation, onglets et recherche natifs UIKit**, catalogue embarqué dans **Capacitor / WKWebView**. Les cartes, catégories, fiches et favoris sont rendus en HTML/CSS. Il ne s’agit donc pas d’une interface intégralement écrite en SwiftUI.

**La compilation iOS pour simulateur a réussi sur GitHub Actions avec Xcode 26.3 le 3 novembre 2026.** L’artefact compilé est disponible dans [l’exécution macOS](https://github.com/akaRukasu/L-affiche/actions/runs/41661418270). Aucune IPA pour iPhone n’a été signée : son export nécessite vos éléments de signature Apple. Le lancement et le rendu sur simulateur ou iPhone restent à vérifier.

## Ce qui fonctionne

- Catalogue cinéma sombre, adapté au mobile et au bureau, avec une icône originale.
- En direct, Bientôt (prochaine heure), Explorer et Ma sélection.
- Recherche par titre, chaîne et genre ; catégories ; fiches détaillées.
- Favoris conservés localement, import JSON validé et retour au catalogue de démonstration.
- PWA installable sur un hébergement HTTPS ; cache hors connexion après une première ouverture réussie.
- Navigation clavier (Tabulation, Entrée, flèches) pour PC et navigateurs TV compatibles. Aucun projet tvOS n’est inclus ; les télécommandes et navigateurs TV restent à tester sur appareil.
- Sur iOS : `UITabBarController`, `UINavigationController`, `UISearchController`, SF Symbols, zones de sécurité et adaptation de la taille du texte. Une seule WKWebView est partagée entre les quatre onglets.

Les données locales de la PWA Safari et celles de l’application iOS sont séparées. Il n’y a ni compte ni synchronisation entre appareils. Les favoris sont stockés localement et peuvent disparaître en cas de suppression de l’application ou de ses données. Aucun flux vidéo n’est diffusé.

## Essayer sur PC

Installer Node.js 24, puis ouvrir un terminal à la racine du projet :

```sh
npm ci
npm run dev
```

Ouvrir l’adresse affichée par le terminal. Pour tester la version de production et son cache PWA :

```sh
npm run build
npm run preview
```

Le service worker n’est activé qu’en production web et ne s’enregistre pas dans l’application iOS. Pour installer la PWA sur iPhone via Safari, héberger le contenu de `dist/` en HTTPS puis utiliser « Sur l’écran d’accueil ». Un serveur PC sur `127.0.0.1` n’est pas accessible directement depuis l’iPhone.

## Compiler sur Mac

Le projet utilise Capacitor **8.6.0**, Node.js **24**, iOS **15.4 minimum** et Swift Package Manager. Le minimum iOS 15.4 assure la disponibilité des panneaux web `<dialog>` utilisés par les fiches. Le workflow sélectionne explicitement **Xcode 26.3** sur `macos-15`. Ce chemin est à adapter si GitHub modifie les versions préinstallées. [Prérequis Capacitor](https://capacitorjs.com/docs/getting-started/environment-setup), [image macOS GitHub](https://github.com/actions/runner-images/blob/main/images/macos/macos-15-Readme.md).

```sh
npm ci
node scripts/configure-ios.mjs
npm run ios:sync
npm run check
npm run ios:open
```

Ouvrir le projet **`ios/App/App.xcodeproj`**, schéma **App**. Il n’y a pas de CocoaPods ni de `.xcworkspace` autonome à utiliser ici. Le projet iOS est déjà créé : ne pas lancer `cap add ios` à nouveau et ne pas supprimer le dossier `ios/`, qui contient la navigation personnalisée.

Choisir d’abord un simulateur pour vérifier le lancement, les quatre onglets, la recherche, l’import et les favoris. Pour un iPhone réel, sélectionner votre équipe dans « Signing & Capabilities » et un Bundle ID disponible. Pour modifier l’identifiant dans les fichiers :

```sh
IOS_BUNDLE_ID=fr.votreorganisation.alaffiche node scripts/configure-ios.mjs
npm run ios:sync
```

Sous PowerShell, définir d’abord `$env:IOS_BUNDLE_ID = 'fr.votreorganisation.alaffiche'`, puis lancer les deux commandes sans le préfixe d’environnement. Le nom visible reste À L’AFFICHE. L’identifiant initial `fr.alaffiche.app` est une valeur de départ ; sa disponibilité chez Apple n’a pas été réservée ni vérifiée.

## GitHub Actions : première compilation sans certificat

1. Créer votre dépôt GitHub et y déposer **le contenu de ce dossier**, fichiers cachés compris : `.github/`, `.gitignore`, `.gitattributes`. `package.json` et `ios/` doivent être à la racine du dépôt.
2. Conserver `package-lock.json`. Ne pas déposer `node_modules/`, certificat, clé privée ou profil Apple.
3. Dans **Actions**, lancer **Vérifier iOS sans certificat**. Le workflow se lance également sur une PR et sur un push dans `main`.
4. Après succès, télécharger **A-LAFFICHE-simulateur-…** dans les artefacts de l’exécution.

Cet artefact contient une application pour le **simulateur sur Mac**. Il n’est pas installable sur un iPhone et ne contient pas d’IPA de distribution. La compilation Swift/Xcode et la génération de cet artefact ont été validées par l’exécution macOS ci-dessus.

## Télécharger une IPA iPhone non signée

Le workflow **Produire une IPA iPhone non signée** compile une version Release **pour iPhone arm64**, puis crée `A-LAFFICHE-NON-SIGNEE.ipa`. Il se lance automatiquement pour les changements du projet ou manuellement dans Actions. Après succès, télécharger l’artefact **A-LAFFICHE-IPA-NON-SIGNEE-…** et extraire le fichier `.ipa` du ZIP GitHub.

**Cette IPA n’a pas de signature Apple de distribution valide et ne peut pas être installée telle quelle sur un iPhone.** Elle devra être signée et provisionnée correctement. Le contrôle vérifie la structure `Payload`, la plateforme iPhoneOS du bundle et la plateforme iOS du binaire arm64. Il rejette une version simulateur, même si son fichier de métadonnées a été renommé.

Pour obtenir directement une IPA signée, utiliser le workflow suivant avec les éléments Apple requis.

## Obtenir une IPA signée

La procédure détaillée se trouve dans [docs/SIGNATURE-IOS.md](docs/SIGNATURE-IOS.md). Elle nécessite un compte Apple Developer adapté à la distribution, un App ID explicite, un certificat de distribution **avec sa clé privée**, et un profil correspondant.

Dans le dépôt GitHub, créer l’environnement **`ios-signing`** via Settings → Environments. Y ajouter :

| Type | Nom | Valeur |
|---|---|---|
| Variable | `IOS_BUNDLE_ID` | App ID exact, par exemple `fr.votreorganisation.alaffiche` |
| Variable | `IOS_TEAM_ID` | Team ID Apple de 10 caractères |
| Secret | `IOS_CERTIFICATE_P12_BASE64` | Certificat Apple Distribution et clé privée, exportés en P12 et encodés en base64 |
| Secret | `IOS_CERTIFICATE_PASSWORD` | Mot de passe non vide du fichier P12 |
| Secret | `IOS_PROVISION_PROFILE_BASE64` | Profil `.mobileprovision` de distribution encodé en base64 |

Dans **Actions → Produire une IPA signée → Run workflow**, choisir :

- **`ad-hoc`** pour les iPhone dont les UDID figurent dans le profil. L’export Xcode utilise la méthode `release-testing`.
- **`app-store-connect`** pour exporter une IPA destinée à l’envoi vers App Store Connect / TestFlight. Ce workflow **ne l’envoie pas** à Apple et ne crée pas de lien TestFlight.

Les deux modes nécessitent le profil correspondant au choix effectué. Un seul profil est configuré à la fois dans cet environnement. Le script contrôle l’expiration du profil, l’équipe, l’App ID explicite, le type de distribution et la correspondance entre le certificat du profil et l’identité privée importée. Xcode archive et exporte, puis `codesign` contrôle l’IPA exportée. Les secrets sont installés dans un trousseau temporaire et nettoyés en fin d’exécution. Les actions GitHub sont épinglées à des révisions précises.

Après succès, ouvrir l’exécution puis **Artifacts → A-LAFFICHE-IPA-…**. Le téléchargement GitHub est un ZIP contenant l’IPA. Sa rétention est de sept jours. Télécharger le fichier ne l’installe pas automatiquement : voir le guide de signature pour la distribution sur iPhone.

## Structure

```text
.github/workflows/ios-check.yml     Compilation simulateur sans secrets
.github/workflows/ios-unsigned-ipa.yml  IPA iPhone arm64, sans signature de distribution
.github/workflows/ios-ipa.yml       Archive et export signés, lancement manuel
assets/AppIcon-1024.png             Icône RGB opaque 1024 × 1024
capacitor.config.json              Bundle ID et dossier web embarqué
src/                               Catalogue, interface et logique partagée
public/                            Icônes PWA, manifest, exemple JSON
dist/                              Version web compilée, régénérable
ios/App/App.xcodeproj/              Projet Xcode et schéma partagé App
ios/App/App/SceneDelegate.swift     Navigation UIKit + connexion à la WKWebView
ios/App/CapApp-SPM/                 Dépendances Swift gérées par Capacitor
scripts/                           Configuration, cache et contrôles de signature
tests/                             Tests du catalogue et des profils Apple
docs/                              Signature, validation et provenance de l’icône
```

## Limites et suite du projet

Les horaires de démonstration sont recalculés au lancement puis progressent avec l’heure réelle. L’import utilise des dates ISO 8601 avec fuseau ; le fichier d’exemple est daté du 3 novembre 2026 et peut donc ne rien afficher dans « En direct ». Utiliser « Explorer » ou importer des horaires actuels. Un fournisseur EPG fiable et ses droits d’utilisation restent à connecter.

La navigation iOS native et le catalogue web forment une application hybride. Les fiches en panneau sont des composants web ; les gestes système, VoiceOver, les tailles de texte et le comportement du clavier doivent encore être vérifiés sur simulateur et iPhone. Une publication App Store nécessite aussi des données utiles, les informations de confidentialité et une revue de conformité. La présence de Capacitor et de commandes natives ne garantit pas l’acceptation Apple. [Critère Apple 4.2](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality).

La compilation et les contrôles sont détaillés dans [docs/VERIFICATION.md](docs/VERIFICATION.md). Les sources et les trois workflows sont publiés dans [akaRukasu/L-affiche](https://github.com/akaRukasu/L-affiche).
