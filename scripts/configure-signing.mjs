import { readFile, writeFile } from 'node:fs/promises';
const { IOS_TEAM_ID: team, IOS_PROFILE_UUID: uuid, IOS_CERT_SHA1: certificate } = process.env;
if (!/^[A-Z0-9]{10}$/.test(team || '') || !/^[0-9A-Fa-f-]{36}$/.test(uuid || '') || !/^[0-9A-F]{40}$/.test(certificate || '')) {
  throw new Error('Identité de signature non validée. Exécuter install-signing.sh auparavant.');
}
// Configure only the App target, so the provisioning profile is never forced onto Pod libraries.
const file = 'ios/App/App.xcodeproj/project.pbxproj';
let project = await readFile(file, 'utf8');
const matches = [...project.matchAll(/CODE_SIGN_STYLE = Automatic;/g)];
if (matches.length !== 2) throw new Error('Configurations Debug/Release App inattendues. Vérifier le projet Xcode.');
project = project.replaceAll('CODE_SIGN_STYLE = Automatic;', `CODE_SIGN_STYLE = Manual;\n\t\t\t\tDEVELOPMENT_TEAM = ${team};\n\t\t\t\tCODE_SIGN_IDENTITY = ${certificate};\n\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "${uuid}";`);
await writeFile(file, project);
console.log('Signature manuelle appliquée à la cible App uniquement.');
