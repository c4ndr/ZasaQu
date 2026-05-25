#!/bin/bash
# ─── ZasaQu — Build APK Android ──────────────────────────────────────────────
# Cara pakai:
#   bash build-android.sh          → debug APK
#   bash build-android.sh release  → release APK (perlu keystore)

set -e
cd "$(dirname "$0")/frontend"

MODE=${1:-debug}

echo "▶ Menyiapkan environment Android..."
cp .env .env.bak 2>/dev/null || true
cp .env.android .env

cleanup() {
  echo "▶ Mengembalikan .env..."
  mv .env.bak .env 2>/dev/null || rm -f .env
}
trap cleanup EXIT

echo "▶ Build web (Vite)..."
npm run build

echo "▶ Sync ke Android (Capacitor)..."
npx cap sync android

echo "▶ Build APK Android ($MODE)..."
cd android

if [ "$MODE" = "release" ]; then
  # Pastikan keystore sudah dikonfigurasi di android/app/build.gradle
  ./gradlew assembleRelease
  APK_PATH="app/build/outputs/apk/release/app-release.apk"
  if [ -f "$APK_PATH" ]; then
    cp "$APK_PATH" "../zasaqu-release.apk"
    echo ""
    echo "✅ APK release siap: $(dirname "$0")/zasaqu-release.apk"
  else
    echo "⚠️  APK release tidak ditemukan — mungkin perlu signing config."
    echo "   Buka Android Studio: cd android && npx cap open android"
  fi
else
  ./gradlew assembleDebug
  APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
  cp "$APK_PATH" "../zasaqu-debug.apk"
  echo ""
  echo "✅ APK debug siap: $(dirname "$0")/zasaqu-debug.apk"

  # Install ke perangkat/emulator jika ADB tersedia
  if command -v adb &>/dev/null && adb devices | grep -q "device$"; then
    echo "▶ Install ke perangkat via ADB..."
    adb install -r "../zasaqu-debug.apk"
    echo "✅ Berhasil diinstall di perangkat."
  fi
fi
