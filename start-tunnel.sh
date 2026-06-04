#!/bin/bash
# ZashaGo — Cloudflare Tunnel Permanen (zasaqu.uk)
# Jalankan: bash /home/candra/zashaGo/start-tunnel.sh

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   ZashaGo — Tunnel Permanen          ║"
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
echo "  Memulai tunnel ke zasaqu.uk..."
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  ✅ ZasaQu siap diakses dari luar jaringan!     ║"
echo "║                                                  ║"
echo "║  🌐 https://zasaqu.uk                           ║"
echo "║                                                  ║"
echo "║  • URL PERMANEN — tidak berubah meski restart    ║"
echo "║  • GPS & kamera aktif (sudah HTTPS)              ║"
echo "║  • API & WebSocket berjalan lewat tunnel ini     ║"
echo "║                                                  ║"
echo "║  Tekan Ctrl+C untuk stop tunnel                  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

cloudflared tunnel --config ~/.cloudflared/config.yml run zasaqu
