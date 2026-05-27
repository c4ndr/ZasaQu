# Modul ZasaMart

Status: **Diimplementasi** — Backend + Frontend aktif (routes terdaftar di `api.php`).

## Fitur yang Sudah Ada

### Pelanggan (Customer)
- Browse kategori, produk, dan toko
- Keranjang belanja per toko
- Checkout dengan debit wallet otomatis
- Riwayat pesanan + detail
- Konfirmasi penerimaan pesanan
- Ulasan produk (per item per order)
- Batal pesanan + refund wallet otomatis

### Penjual (Seller)
- Dashboard toko (status buka/tutup, pesanan baru)
- Manajemen produk (CRUD, upload foto, toggle aktif)
- Manajemen pesanan (konfirmasi, kemas, batal + refund customer)
- Pengaturan profil toko + upload logo & banner

### Admin
- Daftar & detail toko (approve / suspend)
- Buat akun seller manual
- Manajemen produk (toggle aktif)
- Manajemen pesanan (force-cancel)

## Alur Pembayaran
- **Checkout:** wallet customer didebit atomis dalam satu DB transaction
- **Selesai:** wallet seller dikreditkan `seller_income` (total − komisi platform)
- **Batal:** wallet customer direfund penuh (total) oleh seller maupun customer sendiri

## Komisi Platform
Dikonfigurasi via `admin_settings` key `mart_commission_percent` (default 5%).

## File Penting
| Path | Keterangan |
|---|---|
| `routes/modules/zasamart.php` | Semua route `/mart/*` |
| `Controllers/Api/Mart/CustomerController.php` | Endpoint pelanggan |
| `Controllers/Api/Mart/SellerController.php` | Endpoint penjual |
| `Controllers/Api/Admin/MartController.php` | Endpoint admin |
| `Models/Mart*.php` | Model-model ZasaMart |
| `frontend/src/pages/seller/` | Halaman dashboard seller |
| `frontend/src/pages/zasamart/` | Halaman belanja pelanggan |

Lihat BLUEPRINT.md untuk spesifikasi lengkap fase ini.
