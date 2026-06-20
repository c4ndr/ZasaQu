// Category-driven config — satu sumber kebenaran untuk semua ZasaHome pages

export const CATEGORY_CONFIG = {
  laundry: {
    flow: 'item_based', addressLabel: 'Alamat Pickup', pickupOption: true, schedulable: false, icon: '👕',
    skills: ['Cuci Kiloan', 'Cuci Setrika', 'Dry Cleaning', 'Cuci Sepatu', 'Cuci Tas', 'Cuci Karpet', 'Express 3 Jam'],
  },
  pijat: {
    flow: 'on_site', addressLabel: 'Alamat Kunjungan', pickupOption: false, schedulable: true, icon: '💆', scheduleLabel: 'Waktu Kunjungan',
    skills: ['Pijat Tradisional', 'Refleksi Kaki', 'Terapi Bekam', 'Pijat Bayi', 'Pijat Sport', 'Shiatsu', 'Pijat Prenatal', 'Urut Patah Tulang'],
  },
  cleaning: {
    flow: 'on_site', addressLabel: 'Alamat Layanan', pickupOption: false, schedulable: true, icon: '🧹', scheduleLabel: 'Waktu Kunjungan',
    skills: ['Bersih Rumah', 'Deep Cleaning', 'Cuci Sofa', 'Cuci Karpet', 'Bersih Kamar Mandi', 'Bersih Dapur', 'Pasca Renovasi', 'Bersih Kantor'],
  },
  tukang: {
    flow: 'on_site', addressLabel: 'Alamat Layanan', pickupOption: false, schedulable: true, icon: '🔧', scheduleLabel: 'Waktu Kunjungan',
    skills: ['Instalasi Listrik', 'Plumbing / Pipa', 'Cat Tembok', 'Pasang Keramik', 'Las Besi', 'AC Service', 'Atap & Bocor', 'Bongkar Pasang Furnitur'],
  },
  cukur: {
    flow: 'on_site', addressLabel: 'Alamat Kunjungan', pickupOption: false, schedulable: true, icon: '💈', scheduleLabel: 'Waktu Kunjungan',
    skills: ['Potong Rambut', 'Cukur Jenggot', 'Trim & Styling', 'Cuci Rambut', 'Creambath', 'Pewarnaan Rambut', 'Perawatan Kumis', 'Cukur Kepala'],
  },
  lainnya: {
    flow: 'on_site', addressLabel: 'Alamat Layanan', pickupOption: false, schedulable: true, icon: '⚡', scheduleLabel: 'Waktu Kunjungan',
    skills: [],
  },
}

export function getCategoryConfig(category) {
  return CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.laundry
}

export const STATUS_META = {
  // Common
  pending:     { label: 'Menunggu Konfirmasi', color: '#F6AD55', bg: 'rgba(246,173,85,0.12)',  icon: '⏳', step: 0 },
  confirmed:   { label: 'Dikonfirmasi',        color: '#6366F1', bg: 'rgba(99,102,241,0.12)',  icon: '✅', step: 1 },
  completed:   { label: 'Selesai',             color: '#00C896', bg: 'rgba(0,200,150,0.12)',   icon: '✓',  step: -1 },
  cancelled:   { label: 'Dibatalkan',          color: '#F56565', bg: 'rgba(245,101,101,0.12)', icon: '✗',  step: -1 },
  // item_based flow
  picked_up:   { label: 'Sudah Dijemput',      color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)',  icon: '🚚', step: 2 },
  processing:  { label: 'Sedang Diproses',     color: '#F97316', bg: 'rgba(249,115,22,0.12)',  icon: '⚙️', step: 3 },
  ready:       { label: 'Siap',                color: '#00C896', bg: 'rgba(0,200,150,0.12)',   icon: '📦', step: 4 },
  delivering:  { label: 'Sedang Diantar',      color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  icon: '🛵', step: 5 },
  // on_site flow
  traveling:   { label: 'Menuju Lokasi',       color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)',  icon: '🏃', step: 2 },
  in_progress: { label: 'Sedang Dikerjakan',   color: '#F97316', bg: 'rgba(249,115,22,0.12)',  icon: '⚙️', step: 3 },
}

export const FLOW_STEPS = {
  item_based: [
    { key: 'pending',    label: 'Terima'  },
    { key: 'confirmed',  label: 'Konfirm' },
    { key: 'picked_up',  label: 'Jemput'  },
    { key: 'processing', label: 'Proses'  },
    { key: 'ready',      label: 'Siap'    },
    { key: 'delivering', label: 'Antar'   },
    { key: 'completed',  label: 'Selesai' },
  ],
  on_site: [
    { key: 'pending',     label: 'Tunggu'   },
    { key: 'confirmed',   label: 'Konfirm'  },
    { key: 'traveling',   label: 'Menuju'   },
    { key: 'in_progress', label: 'Proses'   },
    { key: 'completed',   label: 'Selesai'  },
  ],
}

export function getNextActions(order) {
  const cfg     = getCategoryConfig(order.provider?.category)
  const isMandiri = order.pickup_type === 'mandiri'

  if (cfg.flow === 'on_site') {
    return {
      pending:     [{ status: 'confirmed',   label: '✓ Terima Order',          color: '#6366F1' },
                    { status: 'cancelled',   label: '✗ Tolak',                  color: '#F56565', danger: true }],
      confirmed:   [{ status: 'traveling',   label: '🏃 Menuju Lokasi',         color: '#8B5CF6' },
                    { status: 'cancelled',   label: '✗ Batalkan',               color: '#F56565', danger: true }],
      traveling:   [{ status: 'in_progress', label: '⚙️ Mulai Kerjakan',        color: '#F97316' }],
      in_progress: [{ status: 'completed',   label: '✓ Selesai',                color: '#027A48' }],
    }[order.status] ?? []
  }

  // item_based
  return {
    pending:    [{ status: 'confirmed',  label: '✓ Terima Order',                color: '#6366F1' },
                 { status: 'cancelled', label: '✗ Tolak',                        color: '#F56565', danger: true }],
    confirmed:  isMandiri
                  ? [{ status: 'processing', label: '⚙️ Barang Diterima, Mulai', color: '#F97316' }]
                  : [{ status: 'picked_up',  label: '🚚 Sudah Jemput',           color: '#8B5CF6' }],
    picked_up:  [{ status: 'processing', label: '⚙️ Mulai Proses',              color: '#F97316' }],
    processing: [{ status: 'ready',      label: '📦 Selesai, Siap',             color: '#00C896' }],
    ready:      isMandiri
                  ? [{ status: 'completed',  label: '✓ Customer Sudah Ambil',    color: '#027A48' }]
                  : [{ status: 'delivering', label: '🛵 Berangkat Antar',         color: '#3B82F6' },
                     { status: 'completed',  label: '✓ Selesai di Lokasi',       color: '#027A48' }],
    delivering: [{ status: 'completed',  label: '✓ Sudah Sampai',               color: '#027A48' }],
  }[order.status] ?? []
}
