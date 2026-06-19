import { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'
import useAppInfo from '../../hooks/useAppInfo'

const MODULES = [
  {
    key: 'zasago',
    label: 'ZasaGo',
    emoji: '📦',
    desc: 'Pengiriman barang & JastipQu (titip sejalur)',
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.20)',
  },
  {
    key: 'zasafood',
    label: 'ZasaFood',
    emoji: '🍜',
    desc: 'Pesan makanan dari merchant lokal',
    color: '#F97316',
    bg: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.20)',
  },
  {
    key: 'zasamart',
    label: 'ZasaShop',
    emoji: '🛒',
    desc: 'Marketplace produk UMKM lokal',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.20)',
  },
  {
    key: 'zasahome',
    label: 'ZasaHome',
    emoji: '🏠',
    desc: 'Layanan rumah: laundry, bersih-bersih, dan jasa lainnya',
    color: '#6366F1',
    bg: 'rgba(99,102,241,0.08)',
    border: 'rgba(99,102,241,0.20)',
  },
  {
    key: 'zasaride',
    label: 'ZasaRide',
    emoji: '🛵',
    desc: 'Ojek & antar jemput penumpang',
    color: '#059669',
    bg: 'rgba(5,150,105,0.08)',
    border: 'rgba(5,150,105,0.20)',
  },
  {
    key: 'zasaserv',
    label: 'ZasaServis',
    emoji: '🔧',
    desc: 'Servis elektronik, kendaraan, dan peralatan rumah',
    color: '#D97706',
    bg: 'rgba(217,119,6,0.08)',
    border: 'rgba(217,119,6,0.20)',
  },
]

export default function AdminModulesPage() {
  const [states, setStates]   = useState({})
  const [saving,  setSaving]  = useState({})
  const [toast,   setToast]   = useState(null)
  const { invalidate } = useAppInfo()

  useEffect(() => {
    api.get('/admin/settings').then(r => {
      const map = {}
      r.data.forEach(s => {
        if (s.key.startsWith('feature_')) {
          const module = s.key.replace('feature_', '')
          map[module] = s.value === '1'
        }
      })
      setStates(map)
    }).catch(() => {})
  }, [])

  async function toggle(moduleKey) {
    const current = states[moduleKey] ?? false
    const next    = !current
    setSaving(s => ({ ...s, [moduleKey]: true }))
    try {
      await api.put(`/admin/settings/feature_${moduleKey}`, { value: next ? '1' : '0' })
      setStates(s => ({ ...s, [moduleKey]: next }))
      // Invalidate cache useAppInfo agar BottomNav & DashboardPage langsung update
      invalidate()
      const mod = MODULES.find(m => m.key === moduleKey)
      showToast('success', `${mod?.label} berhasil ${next ? 'diaktifkan' : 'dinonaktifkan'}.`)
    } catch {
      showToast('error', 'Gagal menyimpan perubahan.')
    } finally {
      setSaving(s => ({ ...s, [moduleKey]: false }))
    }
  }

  function showToast(type, msg) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--k-text)' }}>Modul & Fitur</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--k-muted)' }}>Aktifkan atau nonaktifkan layanan yang tersedia di aplikasi</p>
      </div>

      <div style={{ maxWidth: 640 }}>
        {/* Info banner */}
        <div style={{
          background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 14, padding: '14px 16px', marginBottom: 20,
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>💡</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--k-text)', marginBottom: 3 }}>
              Cara kerja feature flag
            </p>
            <p style={{ fontSize: 12, color: 'var(--k-sub)', lineHeight: 1.6 }}>
              Modul yang <strong>nonaktif</strong> tetap tampil di beranda pelanggan dengan badge <em>"Segera"</em> dan tidak bisa diklik.
              Icon di navigasi bawah juga disembunyikan. Perubahan langsung efektif tanpa perlu rebuild APK.
            </p>
          </div>
        </div>

        {/* Module cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {MODULES.map(mod => {
            const enabled = states[mod.key] ?? false
            const loading = saving[mod.key] ?? false
            return (
              <div key={mod.key} style={{
                background: 'var(--k-surface)',
                border: `1px solid ${enabled ? mod.border : 'var(--k-border)'}`,
                borderRadius: 16,
                padding: '16px 18px',
                display: 'flex', alignItems: 'center', gap: 14,
                transition: 'border-color 0.2s',
              }}>
                {/* Ikon modul */}
                <div style={{
                  width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                  background: enabled ? mod.bg : 'var(--k-input)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, transition: 'background 0.2s',
                }}>
                  {mod.emoji}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--k-text)' }}>
                      {mod.label}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                      background: enabled ? mod.bg : 'var(--k-input)',
                      color: enabled ? mod.color : 'var(--k-muted)',
                      border: `1px solid ${enabled ? mod.border : 'var(--k-border)'}`,
                      transition: 'all 0.2s',
                    }}>
                      {enabled ? 'AKTIF' : 'SEGERA'}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--k-sub)', lineHeight: 1.4, margin: 0 }}>
                    {mod.desc}
                  </p>
                </div>

                {/* Toggle switch */}
                <button
                  onClick={() => !loading && toggle(mod.key)}
                  disabled={loading}
                  style={{
                    flexShrink: 0,
                    width: 50, height: 28,
                    borderRadius: 14,
                    background: loading
                      ? 'var(--k-border)'
                      : enabled ? mod.color : 'var(--k-input)',
                    border: 'none', cursor: loading ? 'wait' : 'pointer',
                    position: 'relative',
                    transition: 'background 0.25s',
                    outline: 'none',
                  }}
                  aria-label={`${enabled ? 'Nonaktifkan' : 'Aktifkan'} ${mod.label}`}
                >
                  <span style={{
                    position: 'absolute',
                    top: 3,
                    left: enabled ? 25 : 3,
                    width: 22, height: 22,
                    borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                    transition: 'left 0.2s cubic-bezier(.4,0,.2,1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10,
                  }}>
                    {loading ? '⏳' : ''}
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'success' ? '#059669' : '#DC2626',
          color: '#fff', padding: '10px 20px', borderRadius: 12,
          fontSize: 13, fontWeight: 600, zIndex: 9999,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          whiteSpace: 'nowrap',
        }}>
          {toast.msg}
        </div>
      )}
    </AdminLayout>
  )
}
