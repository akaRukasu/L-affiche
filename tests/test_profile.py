import copy
import datetime as dt
import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location('validate_profile', pathlib.Path(__file__).parents[1] / 'scripts' / 'validate_profile.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ProfileTests(unittest.TestCase):
    def setUp(self):
        self.now = dt.datetime(2026, 11, 3, tzinfo=dt.timezone.utc)
        self.profile = {
            'UUID': '12345678-1234-1234-1234-123456789ABC',
            'ExpirationDate': dt.datetime(2027, 1, 1),
            'TeamIdentifier': ['ABCDEFGHIJ'], 'ApplicationIdentifierPrefix': ['ABCDEFGHIJ'],
            'Entitlements': {'application-identifier': 'ABCDEFGHIJ.fr.alaffiche.app', 'com.apple.developer.team-identifier': 'ABCDEFGHIJ', 'get-task-allow': False},
            'ProvisionedDevices': ['test-device'], 'Platform': ['iOS'],
        }

    def validate(self, profile=None, mode='ad-hoc', team='ABCDEFGHIJ', bundle='fr.alaffiche.app'):
        return module.validate(profile or self.profile, team, bundle, mode, self.now)

    def test_valid_ad_hoc(self):
        self.assertEqual(self.validate(), self.profile['UUID'])

    def test_valid_app_store(self):
        del self.profile['ProvisionedDevices']
        self.validate(mode='app-store-connect')

    def test_reject_expired_wrong_team_bundle_and_type(self):
        for key, value in [('ExpirationDate', dt.datetime(2020, 1, 1)), ('ProvisionsAllDevices', True), ('Platform', ['tvOS'])]:
            profile = copy.deepcopy(self.profile)
            profile[key] = value
            with self.assertRaises(ValueError):
                self.validate(profile)
        for kwargs in [{'team': 'WRONGTEAM'}, {'bundle': 'fr.other.app'}, {'mode': 'app-store-connect'}]:
            with self.assertRaises(ValueError):
                self.validate(**kwargs)

    def test_reject_development_and_wildcard_profiles(self):
        self.profile['Entitlements']['get-task-allow'] = True
        with self.assertRaises(ValueError):
            self.validate()
        self.profile['Entitlements']['get-task-allow'] = False
        self.profile['Entitlements']['application-identifier'] = 'ABCDEFGHIJ.*'
        with self.assertRaises(ValueError):
            self.validate()


if __name__ == '__main__':
    unittest.main()
