#!/bin/bash
# ZashaGo — Start semua service (production)
# Jalankan: bash /home/candra/zashaGo/start.sh

cd /home/candra/zashaGo

export PHP_INI_SCAN_DIR="/etc/php/8.3/cli/conf.d:/home/candra/zashaGo/php-ini"

echo "Starting ZasaQu (production)..."

# Redis
if ! redis-cli ping > /dev/null 2>&1; then
  nohup redis-server > /tmp/zashago-redis.log 2>&1 &
  sleep 1
  if redis-cli ping > /dev/null 2>&1; then
    echo "✓ Redis:     port 6379"
  else
    echo "✗ Redis:     GAGAL — GPS tidak akan berfungsi"
  fi
else
  echo "✓ Redis:     sudah jalan di port 6379"
fi

# Backend Laravel (artisan serve — single process, cukup untuk skala awal)
nohup php /home/candra/zashaGo/backend/artisan serve --host=127.0.0.1 --port=8000 \
  > /tmp/zashago-backend.log 2>&1 &
echo "✓ Backend:   http://127.0.0.1:8000  (log: /tmp/zashago-backend.log)"

sleep 1

# Nginx — serve frontend dist/ + proxy ke backend
if ! sudo systemctl is-active --quiet nginx; then
  sudo systemctl start nginx
fi
echo "✓ Nginx:     port 80 → dist/ + proxy /api → :8000"

echo ""
echo "Semua service ZasaQu berjalan."
echo "  🌐 Akses publik : https://zasaqu.uk"
echo "  📁 Lokal        : http://localhost:80"
echo ""
echo "Service lain (Reverb, Scheduler, Queue, Tunnel) dikelola Supervisor."
echo "  sudo supervisorctl status"
echo ""
echo "Untuk stop backend: pkill -f 'artisan serve'"
echo "Untuk stop nginx  : sudo systemctl stop nginx"
