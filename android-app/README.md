# Ministry of Communications YPG — Android wrapper

This folder contains the configuration for packaging the existing PWA at https://mocypg.vercel.app/ as an Android Trusted Web Activity (TWA).

- Android application ID: `moc.ypg`
- Display name: `Ministry of Communications YPG`
- Launcher label: `MoC YPG` (short launcher label; the full name is used in the app configuration)
- First version: `1.0.0` (version code 1)

## Build status

This is the Android packaging configuration, not a built APK/AAB. Building and publishing still requires a signing keystore, Digital Asset Links verification, device testing, and a Google Play Console account.

## Build on a computer

1. Install Node.js 18+ and follow the official Bubblewrap CLI setup: https://github.com/GoogleChromeLabs/bubblewrap.
2. From this folder, run `npx @bubblewrap/cli doctor` and then `npx @bubblewrap/cli build --manifest=twa-manifest.json`.
3. Create or supply the signing keystore when prompted. Keep `moc-ypg.keystore` and its passwords private; never commit them to GitHub.
4. Use the signing certificate SHA-256 fingerprint to generate `/.well-known/assetlinks.json` for `https://mocypg.vercel.app`. The fingerprint must match the certificate used for the published app (and the Play App Signing certificate if Play App Signing is enabled).
5. Test the signed APK on Android and upload the AAB to the Play Console when ready.

## Notifications

The website's service worker can display a received push event, but push delivery is not yet configured. A secure subscription endpoint and trusted server-side sender are still required. Do not put push private keys or service-role credentials in client-side files.
