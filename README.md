# ZasaQu

Super-app layanan lokal berbasis komunitas — satu akun, satu dompet untuk semua layanan.

## Modul

| Modul | Status |
|-------|--------|
| **ZasaGo** — Pengiriman & JastipQu | ✅ Fase 1 aktif |
| ZasaFood — Makanan & Minuman | 🔲 Fase 2 |
| ZasaMart — Belanja & Grocery | 🔲 Fase 3 |
| ZasaRide — Transportasi | 🔲 Fase 4 |
| ZasaServ — Jasa & Servis | 🔲 Fase 5 |

## Stack

- **Backend:** Laravel 13.7 · PHP 8.3 · MySQL 8.0 · Redis · Laravel Reverb (WebSocket)
- **Frontend:** React 19 · Vite 8 · Tailwind CSS 4 · React Router 7 · Leaflet

---

## Prasyarat

Pastikan sudah terinstal:

- PHP 8.3 + ekstensi: `mbstring`, `xml`, `curl`, `gd`, `redis`, `exif`
- Composer
- Node.js 18+ & npm
- MySQL 8.0
- Redis

```bash
# Ubuntu / Debian
sudo apt-get install -y php8.3 php8.3-mbstring php8.3-xml php8.3-curl \
  php8.3-gd php8.3-redis php8.3-exif composer mysql-server redis-server
```

---

## Setup Pertama Kali

### 1. Clone repo

```bash
git clone https://github.com/c4ndr/ZasaQu.git
cd ZasaQu
```

### 2. Siapkan database MySQL

```bash
sudo mysql -e "
  CREATE DATABASE IF NOT EXISTS zashago CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS 'zashago'@'localhost' IDENTIFIED BY 'zashago123';
  GRANT ALL PRIVILEGES ON zashago.* TO 'zashago'@'localhost';
  FLUSH PRIVILEGES;
"
```

### 3. Setup Backend

```bash
cd backend

# Install dependensi PHP
composer install

# Salin dan konfigurasi environment
cp .env.example .env
```

Edit `backend/.env` sesuai kebutuhan:

```env
APP_NAME=ZasaQu
APP_ENV=local
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=zashago
DB_USERNAME=zashago
DB_PASSWORD=zashago123

BROADCAST_CONNECTION=reverb
CACHE_STORE=redis
SESSION_DRIVER=redis
REDIS_CLIENT=predis

REVERB_APP_ID=613457
REVERB_APP_KEY=0rmwzbgibpkmjx0t6noa
REVERB_APP_SECRET=zasaqu-secret
REVERB_HOST=localhost
REVERB_PORT=8080

# OTP WhatsApp — kosongkan untuk mode demo (kode OTP tampil di response)
FONNTE_TOKEN=

# QRIS — ganti dengan NMID asli dari acquirer untuk produksi
QRIS_NMID=ID1020001483564
QRIS_MERCHANT_NAME=ZasaQu
QRIS_MERCHANT_CITY=Jakarta
```

```bash
# Generate app key
php artisan key:generate

# Jalankan migrasi dan seeder
php artisan migrate --seed

# Buat symlink storage untuk akses file publik
php artisan storage:link

cd ..
```

### 4. Setup Frontend

```bash
cd frontend

# Install dependensi JS
npm install

# Salin environment
cp .env.example .env 2>/dev/null || touch .env
```

Isi `frontend/.env`:

```env
VITE_REVERB_APP_KEY=0rmwzbgibpkmjx0t6noa
```

```bash
cd ..
```

---

## Menjalankan Proyek

### Development (lokal)

```bash
bash start.sh
```

Ini akan menjalankan semua service sekaligus:

| Service | Alamat |
|---------|--------|
| Backend API | http://localhost:8000 |
| Frontend | http://localhost:5173 |
| WebSocket Reverb | ws://localhost:8080 |
| Redis | localhost:6379 |

Cek log masing-masing service:

```bash
tail -f /tmp/zashago-backend.log
tail -f /tmp/zashago-frontend.log
tail -f /tmp/zashago-reverb.log
tail -f /tmp/zashago-scheduler.log
```

Stop semua service:

```bash
pkill -f "artisan serve" && pkill -f "reverb" && pkill -f "vite"
```

### Akses dari perangkat lain (jaringan lokal / internet)

```bash
bash start-tunnel.sh
```

---

## Akun Default (Seeder)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@zasaqu.com` | `password` |
| Pelanggan | `pelanggan@zasaqu.com` | `password` |
| Mitra Motor | `mitra@zasaqu.com` | `password` |

---

## Cron (Wajib untuk Produksi)

Tambahkan ke crontab server (`crontab -e`):

```
* * * * * cd /path/to/ZasaQu/backend && php artisan schedule:run >> /dev/null 2>&1
```

Jadwal yang berjalan otomatis:
- **Setiap menit** — cek GPS mitra, auto-cancel order pending >24 jam
- **Setiap menit** — auto-confirm order delivered >2 jam
- **Setiap 5 menit** — expire VA dan QRIS yang kedaluwarsa
- **Setiap jam** — bersihkan OTP expired
- **Setiap hari pukul 03.00** — hapus foto order lama

---

## Struktur Proyek

```
ZasaQu/
├── backend/          # Laravel 13 (API + WebSocket)
│   ├── app/
│   │   ├── Console/Commands/   # Scheduled tasks
│   │   ├── Events/             # Broadcast events
│   │   ├── Http/Controllers/   # API controllers
│   │   ├── Models/             # Eloquent models
│   │   └── Services/           # Business logic
│   ├── database/
│   │   ├── migrations/         # Skema database
│   │   └── seeders/            # Data awal
│   └── routes/api.php          # Semua API routes
├── frontend/         # React 19 (SPA)
│   └── src/
│       ├── pages/              # Halaman aplikasi
│       ├── components/         # Komponen reusable
│       ├── hooks/              # Custom React hooks
│       └── services/           # Axios + Laravel Echo
├── start.sh          # Jalankan semua service
├── start-tunnel.sh   # Jalankan dengan akses eksternal
└── BLUEPRINT.md      # Dokumentasi arsitektur lengkap
```

---

## Dokumentasi Lengkap

Lihat [BLUEPRINT.md](./BLUEPRINT.md) untuk dokumentasi arsitektur, API endpoints, struktur database, dan roadmap pengembangan.
