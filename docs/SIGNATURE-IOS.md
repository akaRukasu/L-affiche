# Signature et installation iOS

## Ce que contient le livrable

Des sources, un projet Xcode et des workflows prêts à être exécutés. Il n’y a **aucune IPA produite dans cette préparation**. Renommer un ZIP en `.ipa`, ou fabriquer un dossier `Payload` sans signature, ne rendrait pas l’application installable.

## Choisir la distribution

| Objectif | Signature / profil | Installation |
|---|---|---|
| Tester sur simulateur Mac | Aucun certificat de distribution | Artefact simulateur, ouvrir dans un simulateur compatible |
| Tester sur son iPhone depuis Xcode | Signature de développement gérée avec son Apple ID | Depuis Xcode ; les possibilités d’un compte gratuit sont limitées et ne remplacent pas une distribution Ad Hoc |
| Fournir l’IPA à des iPhone connus | Apple Distribution + profil Ad Hoc incluant leurs UDID | Outil de déploiement Apple compatible, sur les appareils enregistrés et autorisés |
| Distribuer via TestFlight | Apple Distribution + profil App Store Connect | Envoyer le build à App Store Connect, attendre son traitement puis inviter les testeurs |

Le workflow prend en charge les deux modes de distribution Apple Developer : Ad Hoc et App Store Connect. Il ne prend pas en charge Enterprise et ne met pas en place de service de signature tiers. [Documentation Apple Ad Hoc](https://developer.apple.com/help/account/provisioning-profiles/create-an-ad-hoc-provisioning-profile/), [tests d’une version de distribution](https://developer.apple.com/documentation/xcode/testing-a-release-build).

## Préparer les éléments Apple

Dans votre compte Apple Developer, choisir un identifiant unique et enregistrer l’App ID explicite correspondant. Retrouver le Team ID dans les informations de votre adhésion. Pour ce projet, aucune capacité spéciale n’est nécessaire.

Créer ou utiliser un certificat **Apple Distribution** dont vous possédez la clé privée. Sur un Mac, il peut être créé via Xcode ou une demande de certificat, puis exporté depuis Trousseaux d’accès : sélectionner l’identité avec sa clé privée et exporter en `.p12` avec un mot de passe. Un simple `.cer` téléchargé ne contient pas la clé privée et ne suffit pas. Éviter de révoquer un certificat existant utilisé par d’autres applications.

Créer ensuite le profil :

1. Choisir Ad Hoc ou App Store Connect selon l’usage.
2. Sélectionner le même App ID explicite et le certificat de distribution exporté.
3. En Ad Hoc, enregistrer et sélectionner les UDID des iPhone destinataires.
4. Générer et télécharger le profil `.mobileprovision`.

Le Bundle ID, l’équipe, le certificat et le profil doivent correspondre. Le profil et le certificat doivent être valides au moment de la compilation et de l’utilisation. Un artefact signé localement peut encore être refusé par Apple ou un appareil pour une révocation, une expiration, un appareil non autorisé ou une autre condition de distribution.

## Encoder sans divulguer les clés

Sur Mac :

```sh
base64 -i Distribution.p12 | pbcopy
base64 -i ALAffiche.mobileprovision | pbcopy
```

Copier chaque résultat dans le secret GitHub correspondant. Sur PowerShell :

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\chemin\Distribution.p12')) | Set-Clipboard
[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\chemin\ALAffiche.mobileprovision')) | Set-Clipboard
```

Ajouter également le mot de passe P12 comme secret. L’encodage base64 n’est pas un chiffrement. Ces éléments doivent rester dans GitHub Secrets et vos sauvegardes privées, jamais dans le dépôt ou dans un message de chat. Le workflow crée lui-même un mot de passe aléatoire pour le trousseau éphémère du runner. [Méthode recommandée par GitHub pour signer sur macOS](https://docs.github.com/en/actions/how-tos/deploy/deploy-to-third-party-platforms/sign-xcode-applications).

## Après téléchargement

Pour l’Ad Hoc, extraire l’IPA du ZIP d’artefact, puis utiliser un outil Apple de déploiement compatible, par exemple Apple Configurator sur Mac avec l’iPhone connecté. Le profil doit inclure l’UDID de cet iPhone. Le lien d’artefact GitHub n’est pas un lien d’installation OTA. Une installation sans fil nécessiterait une infrastructure de distribution adaptée, qui n’est pas incluse ici.

Pour TestFlight, envoyer l’IPA exportée avec Transporter ou les outils App Store Connect appropriés. Créer au préalable la fiche d’application avec le même Bundle ID, renseigner les informations demandées et distribuer après traitement par Apple. Une éventuelle clé API App Store Connect servirait à automatiser cet envoi ; elle n’est pas requise par ce workflow d’export local.

L’export App Store Connect ne s’installe pas directement comme une IPA Ad Hoc sur n’importe quel iPhone. TestFlight et l’App Store ont leur propre traitement et, selon le cas, leur propre revue Apple.

## Vérification avant publication

Tester le lancement sur iPhone, les onglets natifs, l’import de fichier, la recherche avec accents, les favoris après relance, la rotation, le clavier, VoiceOver et les grandes tailles de texte. Les données de démonstration doivent être remplacées par un service utile avant une soumission commerciale.

Les déclarations de confidentialité doivent correspondre aux données réellement utilisées et aux futurs SDK. Le projet n’ajoute pas de suivi ni de permission sensible et les manifests des dépendances Capacitor sont fournis par leur package Swift. Toute extension (EPG, analytics, publicité, notifications, etc.) demande une nouvelle vérification des permissions, des manifests et des renseignements App Store. [Privacy manifests Capacitor](https://capacitorjs.com/docs/ios/privacy-manifest).
