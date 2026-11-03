"""Check the device bundle and executable in an unsigned IPA, without claiming installability."""
import pathlib
import plistlib
import struct
import sys
import zipfile


def inspect_ipa(file):
    with zipfile.ZipFile(file) as archive:
        if archive.testzip() is not None:
            raise ValueError('Archive IPA endommagée.')
        names = set(archive.namelist())
        roots = {pathlib.PurePosixPath(name).parts[1] for name in names
                 if name.startswith('Payload/') and len(pathlib.PurePosixPath(name).parts) >= 2
                 and pathlib.PurePosixPath(name).parts[1].endswith('.app')}
        if len(roots) != 1:
            raise ValueError('Un unique bundle .app dans Payload est requis.')
        root = 'Payload/' + roots.pop() + '/'
        info = plistlib.loads(archive.read(root + 'Info.plist'))
        if info.get('CFBundleIdentifier') != 'fr.alaffiche.app':
            raise ValueError('Identifiant d’application inattendu.')
        if info.get('CFBundleSupportedPlatforms') != ['iPhoneOS'] or info.get('DTPlatformName') != 'iphoneos':
            raise ValueError('L’IPA doit contenir une version iPhone, pas une version simulateur.')
        executable = info.get('CFBundleExecutable')
        if not isinstance(executable, str) or '/' in executable or '\\' in executable:
            raise ValueError('Nom d’exécutable invalide.')
        data = archive.read(root + executable)
        if len(data) < 32 or struct.unpack_from('<II', data) != (0xFEEDFACF, 0x0100000C):
            raise ValueError('Un exécutable Mach-O arm64 est attendu.')
        # LC_BUILD_VERSION records the actual target platform in the Mach-O executable.
        count = struct.unpack_from('<I', data, 16)[0]
        cursor = 32
        platforms = []
        for _ in range(count):
            command, size = struct.unpack_from('<II', data, cursor)
            if size < 8 or cursor + size > len(data):
                raise ValueError('Commande de chargement Mach-O invalide.')
            if command == 0x32:
                platforms.append(struct.unpack_from('<I', data, cursor + 8)[0])
            cursor += size
        if platforms != [2]:
            raise ValueError('La plateforme Mach-O doit être iOS (2), pas iOS Simulator (7).')
        if root + 'embedded.mobileprovision' in names or root + '_CodeSignature/CodeResources' in names:
            raise ValueError('Cet artefact doit rester sans profil ni signature de distribution.')
        return {'bundle_id': info['CFBundleIdentifier'], 'platform': 'iPhoneOS',
                'architecture': 'arm64', 'minimum_ios': info.get('MinimumOSVersion'),
                'distribution_signed': False}


if __name__ == '__main__':
    print(inspect_ipa(sys.argv[1]))
    print('IPA iPhone vérifiée. Signature et provisionnement valides requis avant installation.')
