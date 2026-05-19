#!/bin/bash
# Script setup HTTPS lokal dengan mkcert
# Jalankan: bash setup-https.sh

set -e

LOCAL_IP=$(ip route get 1 2>/dev/null | awk '{print $7; exit}')
CERT_DIR="$(dirname "$0")"

echo "============================================"
echo "  Setup HTTPS ZashaGo - IP: $LOCAL_IP"
echo "============================================"

# Install mkcert jika belum ada
if ! command -v mkcert &>/dev/null; then
  echo ">> Installing mkcert..."
  sudo apt-get install -y libnss3-tools wget 2>/dev/null
  wget -q "https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-amd64" \
    -O /tmp/mkcert
  chmod +x /tmp/mkcert
  sudo mv /tmp/mkcert /usr/local/bin/mkcert
  echo ">> mkcert berhasil diinstall"
fi

# Install CA lokal
echo ">> Membuat Certificate Authority lokal..."
mkcert -install

# Generate sertifikat
echo ">> Membuat sertifikat untuk $LOCAL_IP..."
cd "$CERT_DIR"
mkcert "$LOCAL_IP" localhost 127.0.0.1

# Salin rootCA agar bisa diunduh dari HP
CA_ROOT=$(mkcert -CAROOT)
cp "$CA_ROOT/rootCA.pem" "$CERT_DIR/rootCA.pem" 2>/dev/null || true

echo ""
echo "============================================"
echo "  SELESAI! Langkah selanjutnya:"
echo "============================================"
echo ""
echo "1. Restart frontend:"
echo "   npm run dev"
echo ""
echo "2. Di HP Android — install sertifikat CA:"
echo "   Buka http://$LOCAL_IP:8000/ca-cert di Chrome HP"
echo "   Unduh & install sertifikat, pilih 'Wi-Fi'"
echo ""
echo "3. Akses ZashaGo di HP:"
echo "   https://$LOCAL_IP:5173"
echo ""
