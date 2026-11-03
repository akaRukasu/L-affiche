"""Verify the exported signature and embedded provisioning profile on the macOS runner."""
import glob
import os
import pathlib
import plistlib
import subprocess
import tempfile
from validate_profile import validate

archives = glob.glob('build/export/*.ipa')
if len(archives) != 1:
    raise SystemExit('Un unique fichier IPA exporté est attendu.')
with tempfile.TemporaryDirectory(prefix='alaffiche-verify-') as directory:
    subprocess.run(['ditto', '-x', '-k', archives[0], directory], check=True)
    apps = list((pathlib.Path(directory) / 'Payload').glob('*.app'))
    if len(apps) != 1:
        raise SystemExit('Payload iOS invalide.')
    app = apps[0]
    subprocess.run(['codesign', '--verify', '--deep', '--strict', str(app)], check=True)
    info = plistlib.loads((app / 'Info.plist').read_bytes())
    if info.get('CFBundleIdentifier') != os.environ['IOS_BUNDLE_ID']:
        raise SystemExit('Bundle ID exporté incorrect.')
    profile = plistlib.loads(subprocess.check_output(['security', 'cms', '-D', '-i', str(app / 'embedded.mobileprovision')]))
    validate(profile, os.environ['IOS_TEAM_ID'], os.environ['IOS_BUNDLE_ID'], os.environ['DISTRIBUTION'])
print('IPA exportée : signature vérifiée localement et profil de distribution cohérent.')
