"""Validate an explicit distribution profile before Xcode uses it. Standard library only."""
import datetime as dt
import hashlib
import os
import pathlib
import plistlib
import re
import subprocess


def validate(profile, team, bundle, mode, now=None):
    now = now or dt.datetime.now(dt.timezone.utc)
    expiry = profile.get('ExpirationDate')
    if not isinstance(expiry, dt.datetime):
        raise ValueError('Date d’expiration du profil absente.')
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=dt.timezone.utc)
    if expiry <= now:
        raise ValueError('Le profil de provisionnement a expiré.')
    if team not in profile.get('TeamIdentifier', []):
        raise ValueError('Le profil appartient à une autre équipe Apple.')
    entitlements = profile.get('Entitlements', {})
    prefixes = profile.get('ApplicationIdentifierPrefix', [])
    if entitlements.get('application-identifier') not in [prefix + '.' + bundle for prefix in prefixes]:
        raise ValueError('Le profil doit utiliser l’App ID explicite correspondant au Bundle ID.')
    if entitlements.get('com.apple.developer.team-identifier') != team:
        raise ValueError('Team ID des entitlements incorrect.')
    if entitlements.get('get-task-allow', False):
        raise ValueError('Un profil de distribution est requis, pas un profil de développement.')
    if 'iOS' not in profile.get('Platform', []):
        raise ValueError('Un profil iOS est requis.')
    if profile.get('ProvisionsAllDevices'):
        raise ValueError('Les profils Enterprise ne sont pas pris en charge par ce workflow.')
    if mode == 'ad-hoc':
        if not profile.get('ProvisionedDevices'):
            raise ValueError('Le profil Ad Hoc doit inclure les UDID des appareils autorisés.')
    elif mode == 'app-store-connect':
        if profile.get('ProvisionedDevices'):
            raise ValueError('Un profil App Store Connect est requis pour TestFlight.')
    else:
        raise ValueError('Mode de distribution inconnu.')
    if not re.fullmatch(r'[0-9A-Fa-f-]{36}', profile.get('UUID', '')):
        raise ValueError('UUID du profil invalide.')
    return profile['UUID']


def main():
    temp = pathlib.Path(os.environ['RUNNER_TEMP'])
    profile = plistlib.loads((temp / 'alaffiche-profile.plist').read_bytes())
    team, bundle, mode = (os.environ[key] for key in ['IOS_TEAM_ID', 'IOS_BUNDLE_ID', 'DISTRIBUTION'])
    uuid = validate(profile, team, bundle, mode)
    # Only identities with a private key and valid certificate appear in find-identity.
    identities = subprocess.check_output(['security', 'find-identity', '-v', '-p', 'codesigning', str(temp / 'alaffiche-signing.keychain-db')], text=True)
    profile_hashes = {hashlib.sha1(cert).hexdigest().upper() for cert in profile.get('DeveloperCertificates', [])}
    matches = [(fingerprint, name) for fingerprint, name in re.findall(r'([0-9A-F]{40}) "([^"]+)"', identities)
               if fingerprint in profile_hashes and ('Apple Distribution:' in name or 'iPhone Distribution:' in name)]
    if len(matches) != 1:
        raise ValueError('Le fichier P12 doit contenir une identité de distribution valide, avec sa clé privée, correspondant au profil.')
    fingerprint = matches[0][0]
    options = {
        'method': 'release-testing' if mode == 'ad-hoc' else 'app-store-connect',
        'destination': 'export', 'teamID': team,
        'signingStyle': 'manual', 'signingCertificate': fingerprint,
        'provisioningProfiles': {bundle: uuid},
        'manageAppVersionAndBuildNumber': False,
    }
    if mode == 'ad-hoc':
        options['thinning'] = '<none>'
    (temp / 'ExportOptions.plist').write_bytes(plistlib.dumps(options))
    for directory in ['Library/MobileDevice/Provisioning Profiles', 'Library/Developer/Xcode/UserData/Provisioning Profiles']:
        destination = pathlib.Path.home() / directory
        destination.mkdir(parents=True, exist_ok=True)
        (destination / (uuid + '.mobileprovision')).write_bytes((temp / 'alaffiche.mobileprovision').read_bytes())
    with open(os.environ['GITHUB_ENV'], 'a', encoding='utf-8') as output:
        output.write(f'IOS_PROFILE_UUID={uuid}\nIOS_CERT_SHA1={fingerprint}\n')
    print('Profil, équipe, Bundle ID et identité de signature cohérents.')


if __name__ == '__main__':
    main()
