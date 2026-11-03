#!/bin/bash
set -uo pipefail
security delete-keychain "$RUNNER_TEMP/alaffiche-signing.keychain-db" 2>/dev/null || true
if [[ -n "${IOS_PROFILE_UUID:-}" && "$IOS_PROFILE_UUID" =~ ^[0-9A-Fa-f-]{36}$ ]]; then
  rm -f "$HOME/Library/MobileDevice/Provisioning Profiles/$IOS_PROFILE_UUID.mobileprovision"
  rm -f "$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles/$IOS_PROFILE_UUID.mobileprovision"
fi
rm -f "$RUNNER_TEMP/alaffiche.p12" "$RUNNER_TEMP/alaffiche.mobileprovision" "$RUNNER_TEMP/alaffiche-profile.plist" "$RUNNER_TEMP/ExportOptions.plist"
