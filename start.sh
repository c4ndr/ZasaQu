#!/bin/bash
# ZashaGo — Start semua service
# Jalankan: bash /home/candra/zashaGo/start.sh

cd /home/candra/zashaGo

# Ekspor PHP_INI_SCAN_DIR agar semua proses PHP mewarisi setting upload
export PHP_INI_SCAN_DIR="/etc/php/8.3/cli/conf.d:/home/candra/zashaGo/php-ini"

echo "Starting ZashaGo..."
echo "PHP upload_max_filesize: $(php -r 'echo ini_get("upload_max_filesize");')"

# Redis (dibutuhkan untuk GPS real-time)
if ! redis-cli ping > /dev/null 2>&1; then
  nohup redis-server > /tmp/zashago-redis.log 2>&1 &
  sleep 1
  if redis-cli ping > /dev/null 2>&1; then
    echo "✓ Redis:     port 6379 (log: /tmp/zashago-redis.log)"
  else
    echo "✗ Redis:     GAGAL JALAN — GPS tidak akan berfungsi"
    echo "  Install dulu: sudo apt-get install -y redis-server"
  fi
else
  echo "✓ Redis:     sudah jalan di port 6379"
fi

# Backend
nohup php /home/candra/zashaGo/backend/artisan serve --host=0.0.0.0 --port=8000 \
  > /tmp/zashago-backend.log 2>&1 &
echo "✓ Backend:   http://0.0.0.0:8000  (log: /tmp/zashago-backend.log)"

sleep 1

# WebSocket Reverb
nohup php /home/candra/zashaGo/backend/artisan reverb:start \
  > /tmp/zashago-reverb.log 2>&1 &
echo "✓ WebSocket: port 8080 (log: /tmp/zashago-reverb.log)"

sleep 1

# Scheduler
nohup php /home/candra/zashaGo/backend/artisan schedule:work \
  > /tmp/zashago-scheduler.log 2>&1 &
echo "✓ Scheduler: aktif (log: /tmp/zashago-scheduler.log)"

sleep 1

# Frontend
nohup bash -c 'cd /home/candra/zashaGo/frontend && npm run dev' \
  > /tmp/zashago-frontend.log 2>&1 &
echo "✓ Frontend:  http://192.168.1.8:5173 (log: /tmp/zashago-frontend.log)"

echo ""
echo "Semua service ZashaGo berjalan di background."
echo "Untuk cek log: tail -f /tmp/zashago-backend.log"
echo "Untuk stop:    pkill -f 'artisan serve' && pkill -f 'reverb' && pkill -f 'vite' && pkill -f 'redis-server'"
