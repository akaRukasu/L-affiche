#!/bin/bash
set -euo pipefail
for name in IOS_CERTIFICATE_P12_BASE64 IOS_CERTIFICATE_PASSWORD IOS_PROVISION_PROFILE_BASE64 IOS_TEAM_ID IOS_BUNDLE_ID DISTRIBUTION; do
  if [[ -z "${!name:-}" ]]; then
    echo "::error::Paramètre ou secret manquant : $name"
    exit 1
  fi
done
umask 077
keychain="$RUNNER_TEMP/alaffiche-signing.keychain-db"
password="$(openssl rand -hex 32)"
echo "::add-mask::$password"
printf '%s' "$IOS_CERTIFICATE_P12_BASE64" | base64 --decode > "$RUNNER_TEMP/alaffiche.p12"
printf '%s' "$IOS_PROVISION_PROFILE_BASE64" | base64 --decode > "$RUNNER_TEMP/alaffiche.mobileprovision"
security create-keychain -p "$password" "$keychain"
security set-keychain-settings -lut 21600 "$keychain"
security unlock-keychain -p "$password" "$keychain"
security import "$RUNNER_TEMP/alaffiche.p12" -P "$IOS_CERTIFICATE_PASSWORD" -t cert -f pkcs12 -k "$keychain" -T /usr/bin/codesign -T /usr/bin/security
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$password" "$keychain" >/dev/null
security list-keychains -d user -s "$keychain" "$HOME/Library/Keychains/login.keychain-db"
security cms -D -i "$RUNNER_TEMP/alaffiche.mobileprovision" > "$RUNNER_TEMP/alaffiche-profile.plist"
python3 scripts/validate_profile.py
rm -f "$RUNNER_TEMP/alaffiche.p12"
