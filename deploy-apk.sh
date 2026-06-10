#!/bin/bash
# Script deploy APK release ke folder /releases/
# Jalankan: ./deploy-apk.sh
# APK disimpan di /releases/ yang TERPISAH dari web root backend/public/
# sehingga web deploy (cp dist/.) tidak pernah bisa menimpa APK.

set -e
cd "$(dirname "$0")/frontend"

echo "=== Build web ==="
npm run build

echo "=== Sync ke Capacitor Android ==="
npx cap sync android

echo "=== Build APK release ==="
cd android && ./gradlew assembleRelease

echo "=== Deploy APK ke releases/ ==="
cp app/build/outputs/apk/release/app-release.apk /home/candra/zashaGo/releases/zasaqu.apk
ls -lh /home/candra/zashaGo/releases/zasaqu.apk

echo "=== Deploy web ke backend/public/ ==="
cp -r /home/candra/zashaGo/frontend/dist/. /home/candra/zashaGo/backend/public/

echo "✓ Deploy selesai. APK: /releases/zasaqu.apk | Web: backend/public/"
