#!/bin/bash
# ZashaGo — HTTPS Tunnel via Cloudflare
# Cukup jalankan: bash /home/candra/zashaGo/start-tunnel.sh

echo ""
echo "╔══════════════════════════════════════╗"
echo "║     ZashaGo — HTTPS Tunnel           ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Cek frontend sudah jalan
if ! curl -s --max-time 3 http://localhost:5173 > /dev/null 2>&1; then
  echo "⚠  Frontend belum jalan di port 5173."
  echo "   Jalankan dulu: bash /home/candra/zashaGo/start.sh"
  echo "   Lalu tunggu beberapa detik, baru jalankan script ini."
  exit 1
fi

echo "✓ Frontend aktif di port 5173"
echo "  Membuka tunnel... mohon tunggu 5-10 detik"
echo ""

# Cloudflared quick tunnel — tidak perlu login, support WebSocket
# Output URL-nya ke stderr, kita capture dari sana
cloudflared tunnel --url http://localhost:5173 2>&1 | while IFS= read -r line; do
  if [[ "$line" == *"trycloudflare.com"* ]]; then
    URL=$(echo "$line" | grep -o 'https://[^ ]*trycloudflare\.com[^ ]*')
    echo "╔══════════════════════════════════════════════════╗"
    echo "║  ✅ ZashaGo siap diakses dari luar jaringan!    ║"
    echo "║                                                  ║"
    printf  "║  🌐 %-46s ║\n" "$URL"
    echo "║                                                  ║"
    echo "║  • Buka di HP / browser luar jaringan            ║"
    echo "║  • GPS & kamera aktif (sudah HTTPS)              ║"
    echo "║  • API & WebSocket berjalan lewat tunnel ini     ║"
    echo "║  • URL berubah setiap restart tunnel             ║"
    echo "║                                                  ║"
    echo "║  Tekan Ctrl+C untuk stop tunnel                  ║"
    echo "╚══════════════════════════════════════════════════╝"
    echo ""
  fi
done
