import importlib.util
import io
import pathlib
import plistlib
import struct
import unittest
import zipfile

spec = importlib.util.spec_from_file_location('unsigned_ipa', pathlib.Path(__file__).parents[1] / 'scripts' / 'verify-unsigned-ipa.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class UnsignedIPATests(unittest.TestCase):
    def bundle(self, platform=2, simulator_plist=False, profile=False, dynamic_runtime=False, bridge=True):
        info = {'CFBundleIdentifier': 'fr.alaffiche.app', 'CFBundleExecutable': 'App',
                'CFBundleSupportedPlatforms': ['iPhoneSimulator' if simulator_plist else 'iPhoneOS'],
                'DTPlatformName': 'iphonesimulator' if simulator_plist else 'iphoneos',
                'MinimumOSVersion': '15.4'}
        commands = struct.pack('<6I', 0x32, 24, platform, 0, 0, 0)
        if dynamic_runtime:
            name = b'@rpath/Capacitor.framework/Capacitor\0'
            size = (24 + len(name) + 7) // 8 * 8
            commands += struct.pack('<6I', 0xC, size, 24, 0, 0, 0) + name + b'\0' * (size - 24 - len(name))
        header = struct.pack('<8I', 0xFEEDFACF, 0x0100000C, 0, 2, 2 if dynamic_runtime else 1, len(commands), 0, 0)
        binary = header + commands
        stream = io.BytesIO()
        with zipfile.ZipFile(stream, 'w') as archive:
            archive.writestr('Payload/App.app/Info.plist', plistlib.dumps(info))
            archive.writestr('Payload/App.app/App', binary)
            if bridge:
                archive.writestr('Payload/App.app/native-bridge.js', b'// test bridge')
            if profile:
                archive.writestr('Payload/App.app/embedded.mobileprovision', b'test')
        stream.seek(0)
        return stream

    def test_accept_device_payload_without_claiming_distribution_signature(self):
        result = module.inspect_ipa(self.bundle())
        self.assertEqual(result['platform'], 'iPhoneOS')
        self.assertFalse(result['distribution_signed'])

    def test_reject_simulator_plist(self):
        with self.assertRaisesRegex(ValueError, 'simulateur'):
            module.inspect_ipa(self.bundle(simulator_plist=True))

    def test_reject_simulator_binary_even_if_plist_says_device(self):
        with self.assertRaisesRegex(ValueError, 'Mach-O'):
            module.inspect_ipa(self.bundle(platform=7))

    def test_reject_profile_in_unsigned_artifact(self):
        with self.assertRaisesRegex(ValueError, 'profil'):
            module.inspect_ipa(self.bundle(profile=True))

    def test_reject_runtime_that_needs_separate_framework_signing(self):
        with self.assertRaisesRegex(ValueError, 'statique'):
            module.inspect_ipa(self.bundle(dynamic_runtime=True))

    def test_reject_missing_bridge_resource_after_static_linking(self):
        with self.assertRaisesRegex(ValueError, 'pont JavaScript'):
            module.inspect_ipa(self.bundle(bridge=False))
