#!/bin/bash
# Script deploy APK release + web
# Jalankan: ./deploy-apk.sh
#
# PENTING: zasaqu.apk TIDAK boleh ada di frontend/public/ — kalau ada,
# Vite akan bundle APK ke dalam dist/, lalu Capacitor akan embed APK
# di dalam APK Android itu sendiri (+51 MB sia-sia).
# APK di-copy langsung ke backend/public/ setelah build.

set -e
cd "$(dirname "$0")/frontend"

echo "=== Build web ==="
npm run build

echo "=== Sync ke Capacitor Android ==="
npx cap sync android

echo "=== Build APK release ==="
cd android && ./gradlew assembleRelease

echo "=== Deploy APK ke releases/ & backend/public/ ==="
cp app/build/outputs/apk/release/app-release.apk /home/candra/zashaGo/releases/zasaqu.apk
cp /home/candra/zashaGo/releases/zasaqu.apk /home/candra/zashaGo/backend/public/zasaqu.apk
ls -lh /home/candra/zashaGo/backend/public/zasaqu.apk

echo "=== Deploy web ke backend/public/ ==="
cp -r /home/candra/zashaGo/frontend/dist/. /home/candra/zashaGo/backend/public/

echo "✓ Deploy selesai. APK: backend/public/zasaqu.apk | Web: backend/public/"
