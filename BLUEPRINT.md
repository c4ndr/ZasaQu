# ZasaQu — Platform Blueprint

> Versi dokumen: 14 Mei 2026
> Status Platform: Fase 1 aktif (ZasaGo ~97%) · Fase 2–5 dalam perencanaan

---

## Daftar Isi

1. [Visi Platform](#1-visi-platform)
2. [Ekosistem Layanan](#2-ekosistem-layanan)
3. [Arsitektur Platform](#3-arsitektur-platform)
4. [Stack Teknologi](#4-stack-teknologi)
5. [Infrastruktur Bersama (Shared Core)](#5-infrastruktur-bersama-shared-core)
6. [Struktur Database](#6-struktur-database)
7. [Modul ZasaGo — Pengiriman & JastipQu](#7-modul-zasago--pengiriman--jastipqu)
8. [Modul ZasaFood — Makanan & Minuman](#8-modul-zasafood--makanan--minuman)
9. [Modul ZasaMart — Belanja & Grocery](#9-modul-zasamart--belanja--grocery)
10. [Modul ZasaRide — Transportasi](#10-modul-zasaride--transportasi)
11. [Modul ZasaServ — Jasa & Servis](#11-modul-zasaserv--jasa--servis)
12. [Sistem Keuangan Terpusat](#12-sistem-keuangan-terpusat)
13. [API & Struktur Kode](#13-api--struktur-kode)
14. [Konfigurasi & Environment](#14-konfigurasi--environment)
15. [Menjalankan Proyek](#15-menjalankan-proyek)
16. [Roadmap Pengembangan](#16-roadmap-pengembangan)
17. [Changelog Pengembangan](#17-changelog-pengembangan)

---

## 1. Visi Platform

**ZasaQu** adalah super-app layanan lokal berbasis komunitas yang menghubungkan pelanggan dengan mitra (penyedia jasa) di sekitar mereka.

### Prinsip Utama

| Prinsip | Penjelasan |
|---------|------------|
| **Satu akun, semua layanan** | Pelanggan dan mitra cukup satu akun untuk semua modul |
| **Satu dompet** | Saldo ZasaQu bisa dipakai di semua layanan |
| **Mitra fleksibel** | Satu mitra bisa aktif di beberapa modul sekaligus |
| **Modular, tumbuh bertahap** | Setiap layanan adalah modul independen yang ditambahkan tanpa merusak yang ada |

### Posisi di Pasar

```
Pelanggan ──→  ZasaQu App  ──→  Mitra Terdekat
                   │
         ┌─────────┼──────────┐
         ↓         ↓          ↓
     ZasaGo    ZasaFood   ZasaMart  ... dst
   (Kirim)   (Makanan)  (Belanja)
```

---

## 2. Ekosistem Layanan

| Modul | Brand | Ikon | Status | Deskripsi |
|-------|-------|------|--------|-----------|
| Pengiriman | **ZasaGo** | 📦 | ✅ Fase 1 | Kirim barang & JastipQu (titip sejalur) |
| Makanan | **ZasaFood** | 🍜 | 🔲 Fase 2 | Order makanan dari warung/restoran lokal |
| Belanja | **ZasaMart** | 🛒 | 🔲 Fase 3 | Belanja kebutuhan sehari-hari, mitra berbelanja |
| Transportasi | **ZasaRide** | 🛵 | 🔲 Fase 4 | Ojek, antar jemput, sewa kendaraan |
| Jasa | **ZasaServ** | 🔧 | 🔲 Fase 5 | Tukang, salon, laundry, servis rumah |

### Matriks Peran per Modul

| Peran | ZasaGo | ZasaFood | ZasaMart | ZasaRide | ZasaServ |
|-------|--------|----------|----------|----------|----------|
| Pelanggan | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mitra Motor | ✅ kurir | ✅ delivery | ✅ shopper | ✅ ojek | — |
| Mitra Mobil | ✅ kurir | ✅ delivery | ✅ shopper | ✅ antar jemput | — |
| Mitra Servis | — | — | — | — | ✅ penyedia jasa |
| Merchant | — | ✅ restoran | ✅ toko | — | — |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 3. Arsitektur Platform

### Gambaran Umum

```
┌──────────────────────────────────────────────────────────────────┐
│                        ZasaQu App                                │
│         React 19 + Vite  ·  Single Page Application             │
│                                                                  │
│  [Dashboard]  [ZasaGo]  [ZasaFood]  [ZasaMart]  [ZasaRide] ... │
│                                                                  │
│  Shared UI: Auth · Wallet · Profile · Notifikasi · Chat         │
└───────────────────────────┬──────────────────────────────────────┘
                            │  HTTP /api/*  +  WS /app/*
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Laravel Backend (Monolith Modular)             │
│                                                                  │
│  ┌─────────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  │
│  │  Core       │  │  ZasaGo   │  │ ZasaFood  │  │ ZasaMart  │  │
│  │  (shared)   │  │  Module   │  │  Module   │  │  Module   │  │
│  │  Auth       │  │  Orders   │  │  Menus    │  │  Products │  │
│  │  Wallet     │  │  GPS      │  │  Merchants│  │  Stores   │  │
│  │  User       │  │  Jastip   │  │  Cart     │  │  Cart     │  │
│  │  Chat       │  │           │  │           │  │           │  │
│  │  Notif      │  └───────────┘  └───────────┘  └───────────┘  │
│  │  Rating     │                                                 │
│  └─────────────┘                                                 │
│                                                                  │
│  Reverb WebSocket  ·  Scheduler  ·  Queue (future)              │
└──────────┬───────────────────────────────────────────────────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
 MySQL          Redis
(data utama)  (GPS · Cache · Session · Rate limit)
```

### Strategi Arsitektur: Modular Monolith

**Mengapa Monolith Modular (bukan Microservices)?**

| Aspek | Monolith Modular | Microservices |
|-------|-----------------|---------------|
| Kompleksitas dev | Rendah | Tinggi |
| Waktu ke market | Cepat | Lambat |
| Skalabilitas | Cukup sampai jutaan user | Sangat tinggi |
| Biaya infra | Rendah | Tinggi |
| Cocok untuk | **Fase sekarang** | Setelah traction |

> **Aturan utama:** Setiap modul harus bisa berdiri sendiri (tidak import langsung dari modul lain). Komunikasi antar-modul via Events atau Service layer bersama.

### Struktur Folder Backend

```
app/
├── Console/Commands/          ← Scheduled tasks (gps:check, orders:auto-confirm, dll)
├── Events/                    ← Broadcast events (OrderStatusUpdated, MitraLocationUpdated, dll)
├── Http/Controllers/Api/
│   ├── Admin/                 ← Admin endpoints
│   ├── Mitra/                 ← Mitra-specific endpoints
│   ├── AuthController.php
│   ├── ChatController.php
│   ├── JastipController.php
│   ├── NotificationController.php  ← [BARU]
│   ├── OrderController.php
│   ├── OrderPhotoController.php
│   ├── RatingController.php        ← [BARU]
│   └── ...
├── Models/
│   ├── Notification.php       ← [BARU]
│   ├── Rating.php             ← [BARU]
│   └── ...
└── Services/
    ├── CommissionService.php
    ├── JastipService.php
    ├── NotificationService.php  ← [BARU]
    ├── OrderService.php
    ├── RatingService.php        ← [BARU]
    ├── WalletService.php
    └── ...

routes/
├── api.php                    ← Semua API routes
└── console.php                ← Scheduler (Laravel 11+ style, bukan Kernel.php)
```

### Struktur Folder Frontend

```
src/
├── pages/
│   ├── NotificationsPage.jsx  ← [BARU] Pusat notifikasi dengan badge
│   ├── OrdersPage.jsx         ← Rating modal, COD konfirmasi, filter riwayat, foto authenticated
│   ├── MitraOrdersPage.jsx    ← Detail panel order, alamat klik ke Google Maps
│   ├── TrackingPage.jsx       ← Alamat klik ke Google Maps, popup peta
│   └── ...
├── hooks/
│   ├── useNotifCount.js       ← [BARU] Poll unread count setiap 30 detik
│   └── ...
└── services/
    └── api.js
```

---

## 4. Stack Teknologi

### Backend

| Komponen | Teknologi | Versi |
|----------|-----------|-------|
| Framework | Laravel | 13.7 |
| Bahasa | PHP | 8.3 |
| Auth | Laravel Sanctum | — |
| WebSocket | Laravel Reverb | — |
| Database | MySQL | 8.0 |
| Cache / GPS / Rate limit | Redis | latest |
| Geocoding | OSRM + Haversine fallback | — |
| OTP WhatsApp | Fonnte API | — |
| Queue (future) | Laravel Horizon + Redis | — |

### Frontend

| Komponen | Teknologi | Versi |
|----------|-----------|-------|
| Framework | React | 19 |
| Build tool | Vite | 8 |
| CSS | Tailwind CSS | 4 |
| Routing | React Router | 7 |
| Peta | Leaflet + React Leaflet | 5 |
| Realtime | Laravel Echo + Pusher.js | — |
| HTTP | Axios | 1.16 |

---

## 5. Infrastruktur Bersama (Shared Core)

### Auth & User
- Login/Register (email/password + OTP WhatsApp)
- JWT-style token via Sanctum
- Role-based access per modul
- OTP rate limit: **max 3 request/nomor/jam** via Redis
- Profil & alamat user

### Dompet (Wallet)
- Satu saldo ZasaQu untuk semua layanan
- Top up: Transfer manual, Virtual Account, QRIS Dinamis (EMVCo + PADG BI)
- Withdraw untuk mitra
- Riwayat transaksi lintas modul
- `wallet_transactions.service_module` mencatat dari modul mana (default `zasago`)

### GPS & Lokasi
- `useGps` hook di frontend (WebSocket ke Reverb)
- Redis key `gps:mitra:{id}` untuk tracking real-time, TTL **150 detik**
- Anti-spoofing: update GPS ditolak jika kecepatan >150 km/h dari posisi sebelumnya
- Haversine / OSRM untuk kalkulasi jarak
- Mitra harus GPS aktif di Redis **sebelum** bisa buka sesi JastipQu

### Chat In-App
- Chat room terikat ke `order_id` dan `service_module`
- Template pesan cepat (8 template)
- Broadcast via Reverb
- Deteksi & blokir nomor HP/link di pesan
- Eskalasi pelanggaran per room: warning → **suspend room** setelah 5 pelanggaran kumulatif
- `chat_rooms.violation_count` dan `chat_rooms.is_suspended` untuk tracking

### Notifikasi In-App
- Tabel `notifications` — notif tersimpan di DB, tidak hilang
- Trigger otomatis saat status order berubah (accepted, picked_up, delivered, completed)
- Badge count di dashboard (polling 30 detik)
- Halaman `/notifications` dengan mark-read per item atau semua sekaligus
- `NotificationService` dapat dipanggil dari modul lain

### Rating & Review
- Bidirectional: pelanggan rating mitra, mitra rating pelanggan
- Satu rating per orang per order
- `average_rating` di `mitra_details` dihitung ulang otomatis setiap ada rating baru
- Modal rating muncul di `OrdersPage` (pelanggan) dan `MitraOrdersPage` (mitra) setelah order completed

### Admin Panel
- Dashboard statistik lintas modul
- Manajemen user & mitra
- Persetujuan top up / withdraw
- Konfigurasi per-modul via `admin_settings`
- Audit log semua aksi admin
- Top Mitra menggunakan `average_rating` nyata dari tabel `ratings`

---

## 6. Struktur Database

### Kolom `service_module`

Tabel-tabel inti punya kolom `service_module` untuk memisahkan data antar layanan:

| Tabel | service_module values |
|-------|-----------------------|
| `orders` | `zasago`, `zasafood`, `zasamart`, `zasaride`, `zasaserv` |
| `wallet_transactions` | sama seperti di atas |
| `chat_rooms` | sama seperti di atas |

### Tabel Shared

| Tabel | Fungsi |
|-------|--------|
| `users` | Semua pengguna platform |
| `mitra_details` | Data tambahan mitra (is_online, last_seen_at, average_rating, badge) |
| `wallets` | Saldo per user |
| `wallet_transactions` | Mutasi saldo lintas modul + service_module |
| `top_up_requests` | Top up (semua metode) |
| `virtual_accounts` | VA untuk top up |
| `qris_transactions` | QRIS dinamis untuk top up |
| `withdraw_requests` | Withdraw mitra |
| `bank_accounts` | Rekening bank platform |
| `otp_codes` | OTP WhatsApp |
| `admin_settings` | Config sistem |
| `audit_logs` | Log aksi admin |
| `chat_rooms` | Ruang chat (violation_count, is_suspended, suspended_at) |
| `chat_messages` | Pesan chat |
| `notifications` | **[BARU]** In-app notifications (user_id, type, title, body, data, read_at) |
| `ratings` | **[BARU]** Rating bidirectional (order_id, rater_id, ratee_id, rater_role, score, comment) |

### Tabel ZasaGo (Modul 1)

| Tabel | Fungsi |
|-------|--------|
| `orders` | Order pengiriman & jastip — kolom snapshot: `rate_base_fee`, `rate_per_km`, `commission_rate` |
| `jastip_sessions` | Sesi JastipQu mitra |
| `order_photos` | Foto bukti pengiriman (diakses via endpoint authenticated) |
| `item_categories` | Kategori barang |

### Kolom Timestamp Order (Lengkap)

```
pending → accepted_at → on_pickup_at → picked_up_at → on_delivery_at → delivered_at → completed_at
```

Semua timestamp tersimpan saat transisi status. `cancelled_at` untuk order dibatalkan.

### Snapshot Tarif di Order

Setiap order menyimpan tarif saat dibuat agar tidak berubah walau admin edit setting:

| Kolom | Fungsi |
|-------|--------|
| `rate_base_fee` | Tarif dasar motor/mobil saat order dibuat |
| `rate_per_km` | Tarif per km saat order dibuat |
| `commission_rate` | Persentase komisi platform saat order dibuat |

---

## 7. Modul ZasaGo — Pengiriman & JastipQu

> **Status: ✅ Fase 1 (~97% selesai)**

### Fitur Selesai
- Order pengiriman barang (reguler)
- GPS tracking mitra real-time dengan anti-spoofing
- JastipQu — titip barang ke mitra yang sejalur
- Chat in-app per order (dengan eskalasi pelanggaran)
- Upload foto bukti pengiriman (3 tahap, akses authenticated)
- Auto-confirm, auto-expire, GPS-lost handler
- Rating mitra oleh pelanggan dan sebaliknya
- Notifikasi in-app setiap perubahan status
- COD konfirmasi oleh pelanggan (tombol di app)
- Filter riwayat order (Semua / Selesai / Dibatalkan)
- Alamat pickup/dropoff klik → Google Maps navigasi
- Panel detail order lengkap di halaman mitra (tidak perlu buka halaman lain)

### Alur Order Master

```
pending → accepted → on_pickup → picked_up → on_delivery → delivered → completed
```

Setiap transisi menyimpan timestamp dan mengirim notifikasi ke pelanggan.

### Alur JastipQu

```
Mitra aktifkan GPS → buka sesi (GPS wajib ada di Redis) → pelanggan titip
→ Mitra antar → sesi ditutup → diskon otomatis untuk pelanggan master
```

**Aturan sesi:**
- Mitra harus GPS aktif sebelum buka sesi (validasi Redis key)
- `gps:check` beri grace period 2 menit untuk sesi baru (mencegah race condition)
- Sesi auto-expire setelah 4 jam tidak ada aktivitas
- Mitra auto-offline jika tidak update GPS >30 menit
- Hanya mitra `is_online=true` yang tampil di daftar available sessions

### Kalkulasi Ongkir

```
ongkir = base_fee + (jarak_km × per_km)
jarak  = OSRM (jalan nyata) atau Haversine (fallback)
Komisi = ongkir × commission_rate%  [di-snapshot saat order dibuat]
```

### Konfigurasi (via Admin)

| Key | Default | Keterangan |
|-----|---------|------------|
| `shipping_motor_base` | Rp 5.000 | Tarif dasar motor |
| `shipping_motor_per_km` | Rp 3.000 | Per km motor |
| `shipping_mobil_base` | Rp 8.000 | Tarif dasar mobil |
| `shipping_mobil_per_km` | Rp 5.000 | Per km mobil |
| `commission_master_percent` | 10% | Komisi platform (di-snapshot ke order) |
| `commission_jastip_percent` | 10% | Komisi jastip |
| `discount_master_percent` | 30% | Diskon dari total jastip |
| `max_jastip_motor` | 3 | Maks titipan motor |
| `max_jastip_mobil` | 8 | Maks titipan mobil |
| `auto_confirm_minutes` | 120 | Menit sebelum auto-confirm setelah delivered |
| `cod_confirm_timeout_minutes` | 60 | Menit sebelum COD auto-complete |
| `corridor_default_meters` | 500 | Lebar koridor jastip default |

### Scheduled Tasks

| Perintah | Frekuensi | Fungsi |
|----------|-----------|--------|
| `gps:check` | Setiap menit | Tutup sesi jastip GPS mati, auto-offline mitra, auto-cancel order pending >24 jam, expire sesi jastip >4 jam tidak aktif |
| `orders:auto-confirm` | Setiap menit | Auto-complete order delivered + COD timeout |
| `payments:expire` | Setiap 5 menit | Expire VA/QRIS kedaluwarsa |
| `photos:clean --days=7` | Setiap hari 03:00 | Hapus foto order lama |
| `otp:cleanup` | Setiap jam | Hapus OTP expired |

> Scheduler didaftarkan di `routes/console.php` (Laravel 11+ — bukan Kernel.php).
> Pastikan cron server: `* * * * * cd /path && php artisan schedule:run >> /dev/null 2>&1`

---

## 8. Modul ZasaFood — Makanan & Minuman

> **Status: 🔲 Fase 2 (direncanakan)**

### Konsep
Pelanggan order makanan dari merchant lokal (warung, restoran, kantin), mitra mengambil dan mengantarkan.

### Aktor
- **Pelanggan** — order via app, pilih merchant & menu
- **Merchant** — terima order, siapkan pesanan
- **Mitra** — ambil dari merchant, antar ke pelanggan
- **Admin** — onboarding merchant, fee management

### Alur

```
Pelanggan pilih merchant → pilih menu → checkout → pembayaran
        ↓
Merchant terima order → siapkan pesanan → beri notif siap
        ↓
Mitra terdekat terima notif → pickup di merchant → antar ke pelanggan
```

### Fitur yang Direncanakan
- Browsing merchant by kategori & jarak
- Manajemen menu (merchant dashboard)
- Estimasi waktu masak + waktu kirim
- Rating merchant & mitra per order
- Jam operasional merchant
- Promo & voucher per merchant

---

## 9. Modul ZasaMart — Belanja & Grocery

> **Status: 🔲 Fase 3 (direncanakan)**

### Konsep
Mitra berbelanja di toko/minimarket atas permintaan pelanggan, lalu mengantarkan.

### Alur

```
Pelanggan tulis daftar belanja + anggaran → kirim ke mitra
        ↓
Mitra cari & beli barang → foto struk → konfirmasi harga ke pelanggan
        ↓
Pelanggan setujui → mitra kirim → selesai
```

---

## 10. Modul ZasaRide — Transportasi

> **Status: 🔲 Fase 4 (direncanakan)**

### Layanan

| Tipe | Keterangan |
|------|------------|
| **ZasaRide Motor** | Ojek motor, antar jemput |
| **ZasaRide Mobil** | Taksi/mobil, antar jemput |
| **ZasaRide Sewa** | Sewa kendaraan harian |

---

## 11. Modul ZasaServ — Jasa & Servis

> **Status: 🔲 Fase 5 (direncanakan)**

### Layanan
Tukang listrik, tukang air, salon panggil, laundry jemput-antar, servis AC, dll.

---

## 12. Sistem Keuangan Terpusat

### Sumber Pendapatan Platform

| Modul | Model Komisi |
|-------|-------------|
| ZasaGo | % dari ongkir (snapshot saat order dibuat) |
| ZasaFood | % dari subtotal order + ongkir delivery |
| ZasaMart | % dari ongkir + markup opsional |
| ZasaRide | % dari tarif perjalanan |
| ZasaServ | % dari biaya jasa |

### Alur Keuangan Standar

```
Pelanggan bayar (wallet/COD)
        ↓
Platform ambil komisi (commission_rate yang di-snapshot)
        ↓
Mitra / penyedia terima net income
        ↓
Mitra ajukan withdraw → admin proses
```

### Top Up

| Metode | Status |
|--------|--------|
| Transfer manual | ✅ Aktif |
| Virtual Account | ✅ Aktif (simulasi) |
| QRIS Dinamis (EMVCo) | ✅ Aktif (simulasi — NMID perlu diganti NMID asli) |
| Payment gateway (Midtrans/Xendit) | 🔲 Planned |

> **QRIS Dinamis:** Sudah generate string QRIS EMVCo yang valid (Point of Initiation=12, nominal tertanam, CRC-16/CCITT-FALSE). Untuk produksi: ganti `QRIS_NMID` di `.env` dengan NMID nyata dari acquirer (GoPay Bisnis, bank, dll).

---

## 13. API & Struktur Kode

### Endpoint Core (Shared)

| Endpoint | Fungsi |
|----------|--------|
| `POST /auth/register` | Daftar |
| `POST /auth/login` | Login |
| `POST /auth/otp/send` | Kirim OTP (max 3x/nomor/jam) |
| `GET /auth/me` | Profil |
| `GET /wallet/summary` | Saldo |
| `POST /topup/*` | Top up |
| `POST /withdraw` | Withdraw mitra |
| `GET /shipping/estimate` | Estimasi ongkir |

### Endpoint ZasaGo

| Endpoint | Fungsi |
|----------|--------|
| `GET /orders` | List order pelanggan (filter: ?status=, ?type=, ?payment_method=) |
| `POST /orders` | Buat order |
| `POST /orders/{id}/cancel` | Batalkan order |
| `POST /orders/{id}/confirm-cod` | **[BARU]** Pelanggan konfirmasi terima COD |
| `POST /orders/{id}/photos` | Upload foto bukti |
| `GET /orders/{id}/photos/{stage}` | **[BARU]** Akses foto (authenticated) |
| `POST /orders/{id}/rate` | **[BARU]** Submit rating |
| `GET /orders/{id}/rating` | **[BARU]** Cek rating user untuk order ini |
| `GET /mitra/orders/available` | Order tersedia untuk mitra |
| `POST /mitra/orders/{id}/accept` | Terima order |
| `PATCH /mitra/orders/{id}/status` | Update status order |
| `POST /mitra/gps/update` | Update GPS (anti-spoofing: tolak jika >150 km/h) |
| `GET /mitra/gps/status` | Status GPS |
| `POST /mitra/gps/lost` | Lapor GPS mati |
| `POST /jastip/sessions` | Buka sesi (GPS wajib aktif di Redis) |
| `DELETE /jastip/sessions/current` | Tutup sesi |
| `GET /jastip/sessions/available` | Sesi tersedia (hanya mitra is_online=true) |
| `POST /jastip/sessions/{id}/order` | Titip ke sesi |
| `GET /notifications` | **[BARU]** List notifikasi |
| `POST /notifications/read` | **[BARU]** Tandai dibaca |
| `GET /notifications/unread-count` | **[BARU]** Jumlah belum dibaca |

### Konvensi Response

```json
{
  "data": { ... },
  "message": "...",
  "meta": { "current_page": 1, "total": 50 }
}
```

---

## 14. Konfigurasi & Environment

### Backend (`backend/.env`)

```env
APP_NAME=ZasaQu
APP_ENV=local
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_DATABASE=zashago
DB_USERNAME=zashago
DB_PASSWORD=zashago123

BROADCAST_CONNECTION=reverb
REDIS_CLIENT=predis

REVERB_APP_ID=613457
REVERB_APP_KEY=0rmwzbgibpkmjx0t6noa
REVERB_HOST=localhost
REVERB_PORT=8080

FONNTE_TOKEN=          # Token OTP WhatsApp (kosong = mode demo)

# QRIS — ganti NMID dengan NMID nyata dari acquirer untuk produksi
QRIS_NMID=ID1020001483564
QRIS_MERCHANT_NAME=ZasaQu
QRIS_MERCHANT_CITY=Jakarta

ZASAQU_MIN_MITRA_BALANCE=10000
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=                    # Kosong = Vite proxy (benar)
VITE_REVERB_APP_KEY=0rmwzbgibpkmjx0t6noa
VITE_REVERB_HOST=                # Kosong = window.location.hostname
```

---

## 15. Menjalankan Proyek

### Setup Pertama Kali

```bash
# Install sistem
sudo apt-get install -y redis-server
sudo mysql -e "CREATE DATABASE IF NOT EXISTS zashago; ..."

# Backend
cd zashaGo/backend
composer install
php artisan migrate
php artisan db:seed
php artisan storage:link

# Frontend
cd ../frontend
npm install
```

### Jalankan

```bash
bash zashaGo/start.sh
```

### Akses dari Luar

```bash
bash zashaGo/start-tunnel.sh
```

### Cron Server (Wajib untuk Produksi)

```bash
* * * * * cd /path/to/zashaGo/backend && php artisan schedule:run >> /dev/null 2>&1
```

---

## 16. Roadmap Pengembangan

### Fase 1 — ZasaGo (Sekarang ~97%)
> Target: Stabil & siap produksi

- [x] Order pengiriman barang
- [x] JastipQu (titip sejalur) + koridor validation
- [x] GPS tracking real-time + anti-spoofing
- [x] Wallet, top up (manual, VA, QRIS dinamis), withdraw
- [x] Chat in-app + eskalasi pelanggaran (suspend room)
- [x] Foto bukti pengiriman (3 tahap, akses authenticated)
- [x] Admin panel lengkap
- [x] Rating mitra ↔ pelanggan (bidirectional)
- [x] Notifikasi in-app (semua status order)
- [x] COD konfirmasi pelanggan via app
- [x] Snapshot tarif & komisi per order
- [x] Auto-cancel order pending >24 jam
- [x] Auto-offline mitra GPS >30 menit
- [x] Filter riwayat order
- [x] Alamat klik → Google Maps navigasi
- [x] Panel detail order di halaman mitra
- [ ] OTP WhatsApp aktif (perlu token Fonnte)
- [ ] Payment gateway nyata (Midtrans/Xendit)
- [ ] Push notification FCM (saat ini in-app saja)
- [ ] Onboarding mitra baru (form + verifikasi)

### Fase 2 — ZasaFood
> Target: +3–4 bulan setelah Fase 1 stabil

- [ ] Onboarding & dashboard merchant
- [ ] Manajemen menu & stok
- [ ] Order makanan end-to-end
- [ ] Estimasi waktu masak + delivery
- [ ] Rating merchant & driver per order

### Fase 3 — ZasaMart
> Target: +2–3 bulan setelah ZasaFood

- [ ] Daftar belanja dengan estimasi harga
- [ ] Chat belanja real-time
- [ ] Konfirmasi harga aktual + foto struk
- [ ] Template daftar belanja tersimpan

### Fase 4 — ZasaRide
> Target: +3–4 bulan setelah ZasaMart

- [ ] Ride matching mitra-pelanggan
- [ ] Tarif dinamis
- [ ] Verifikasi dokumen mitra (SIM, STNK)
- [ ] SOS button keamanan
- [ ] Rating wajib pasca perjalanan

### Fase 5 — ZasaServ
> Target: +3–4 bulan setelah ZasaRide

- [ ] Onboarding penyedia jasa + verifikasi
- [ ] Sistem booking terjadwal
- [ ] Kalender ketersediaan
- [ ] Estimasi & konfirmasi harga aktual
- [ ] Portfolio & ulasan penyedia

### Infrastruktur (Paralel)
- [ ] Laravel Horizon + Queue untuk proses async
- [ ] FCM Push Notification terpusat
- [ ] Sistem voucher & promo lintas modul
- [ ] Laporan keuangan export (CSV/PDF)
- [ ] Aplikasi mobile native (React Native)
- [ ] Multi-kota & manajemen zona layanan

---

## 17. Changelog Pengembangan

### 14 Mei 2026 — Sprint Penyelesaian Fase 1

#### Backend

| Komponen | Perubahan |
|----------|-----------|
| `ratings` table | Migration baru — rating bidirectional order_id, rater_id, ratee_id, rater_role, score, comment |
| `notifications` table | Migration baru — notifikasi in-app dengan read_at |
| `orders` table | Tambah kolom: `on_pickup_at`, `on_delivery_at`, `rate_base_fee`, `rate_per_km`, `commission_rate` |
| `chat_rooms` table | Tambah kolom: `violation_count`, `is_suspended`, `suspended_at` |
| `wallet_transactions` | Aktifkan kolom `service_module` di model & fillable |
| `RatingService` | Hitung ulang `average_rating` di `mitra_details` setiap rating baru |
| `NotificationService` | Shortcut per event: orderAccepted, orderPickedUp, orderDelivered, orderCompleted, dll |
| `OrderService` | Trigger notifikasi otomatis setiap transisi status |
| `CommissionService` | Gunakan `commission_rate` snapshot dari order, fallback ke AdminSetting |
| `CheckGpsStatus` | Grace period 2 menit untuk sesi baru; auto-offline mitra; auto-cancel pending >24 jam; expire jastip >4 jam |
| `AutoConfirmOrders` | COD timeout sekarang memanggil `updateStatus('completed')` — mitra langsung dapat saldo |
| `GpsController` | TTL Redis 90s → 150s; anti-spoofing tolak update >150 km/h |
| `JastipController` | Validasi GPS aktif di Redis sebelum izinkan buka sesi |
| `JastipService` | Filter `whereHas is_online=true` — hanya tampilkan mitra yang online |
| `ChatController` | Suspend room setelah 5 pelanggaran kumulatif; cek `is_suspended` sebelum kirim pesan |
| `OrderPhotoController` | JPEG quality 72 → 82; endpoint `serve()` authenticated |
| `OtpController` | Rate limit 3 OTP/nomor/jam via Redis Cache |
| `StatController` | `topMitra()` gunakan `withAvg` dari tabel `ratings` + tambah field `is_online` |
| `Mitra/OrderController` | `myOrders()` load `jastipSession` + tandai `mitra_rating` per order |
| `OrderController` | `index()` support filter `?status=`, `?type=`, `?payment_method=`; return `user_rating` per order; endpoint `confirmCod()` |

#### Frontend

| Komponen | Perubahan |
|----------|-----------|
| `NotificationsPage` | Halaman baru — list notif, mark read, waktu relatif, navigasi ke order |
| `useNotifCount` | Hook baru — poll unread count setiap 30 detik |
| `DashboardPage` | Bell 🔔 dengan badge merah di header |
| `OrdersPage` | Modal rating bintang; tombol "✓ Terima COD"; filter chip riwayat; foto via URL authenticated |
| `MitraOrdersPage` | `OrderDetailPanel` di AvailableCard & ActiveCard; `MitraRatingModal` untuk rating pelanggan; `MapsLink` klik ke Google Maps |
| `TrackingPage` | `MapsLink` klik ke Google Maps; popup peta dengan link navigasi |
| `ChatPage` | Banner merah saat room disuspend; textarea disabled |
| `useChatRoom` | Return `suspended` state; update saat kirim pesan terblokir |
| `App.jsx` | Route `/notifications` baru |

---

*Dokumen ini adalah living document — diperbarui seiring perkembangan platform.*
*Terakhir diperbarui: 14 Mei 2026*
