import { useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'

const TARGET_OPTIONS = [
  { value: 'all',           label: 'Semua Pengguna',    icon: '👥' },
  { value: 'customer',      label: 'Pelanggan',          icon: '🛒' },
  { value: 'mitra',         label: 'Semua Mitra',        icon: '🏍️' },
  { value: 'merchant',      label: 'Merchant Makanan',   icon: '🍽️' },
  { value: 'seller',        label: 'Seller Mart',        icon: '🛍️' },
  { value: 'home_provider', label: 'Provider ZasaHome',  icon: '🏠' },
  { value: 'serv_provider', label: 'Provider ZasaServis', icon: '🔧' },
]

export default function AdminBroadcastPage() {
  const [target,  setTarget]  = useState('all')
  const [title,   setTitle]   = useState('')
  const [body,    setBody]    = useState('')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState(null)

  async function handleSend(e) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    setLoading(true); setResult(null); setError(null)
    try {
      const r = await api.post('/admin/broadcast', { target, title: title.trim(), body: body.trim() })
      setResult(r.data.message)
      setTitle(''); setBody('')
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengirim notifikasi.')
    } finally { setLoading(false) }
  }

  return (
    <AdminLayout>
      <div style={{ maxWidth: 560 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--k-text)', marginBottom: 4 }}>
          📢 Broadcast Notifikasi
        </h1>
        <p style={{ fontSize: 13, color: 'var(--k-muted)', marginBottom: 24 }}>
          Kirim notifikasi push ke segmen pengguna tertentu.
        </p>

        {result && (
          <div style={{ background: 'rgba(0,200,150,0.1)', border: '1.5px solid rgba(0,200,150,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, color: '#027A48', fontWeight: 600, fontSize: 14 }}>
            ✓ {result}
          </div>
        )}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, color: '#DC2626', fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Target segmen */}
          <div>
            <label style={{ display: 'block', fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--k-text)' }}>Target Penerima</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
              {TARGET_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setTarget(opt.value)} style={{
                  padding: '10px 12px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                  border: `2px solid ${target === opt.value ? 'var(--k-accent)' : 'var(--k-border)'}`,
                  background: target === opt.value ? 'rgba(var(--k-accent-rgb),0.08)' : 'var(--k-card)',
                  color: target === opt.value ? 'var(--k-accent)' : 'var(--k-text)',
                  fontWeight: target === opt.value ? 700 : 500, fontSize: 13,
                  transition: 'all 0.15s',
                }}>
                  <span style={{ marginRight: 6 }}>{opt.icon}</span>{opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Judul */}
          <div>
            <label style={{ display: 'block', fontWeight: 700, fontSize: 13, marginBottom: 6, color: 'var(--k-text)' }}>Judul Notifikasi</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Cth: Promo Akhir Pekan!"
              maxLength={100}
              required
              style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
            />
            <div style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 4, textAlign: 'right' }}>{title.length}/100</div>
          </div>

          {/* Isi pesan */}
          <div>
            <label style={{ display: 'block', fontWeight: 700, fontSize: 13, marginBottom: 6, color: 'var(--k-text)' }}>Isi Pesan</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Cth: Dapatkan diskon 20% untuk semua pesanan hari ini! Gunakan kode HEMAT20."
              maxLength={500}
              rows={4}
              required
              style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 14, boxSizing: 'border-box', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
            />
            <div style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 4, textAlign: 'right' }}>{body.length}/500</div>
          </div>

          {/* Preview */}
          {(title || body) && (
            <div style={{ background: 'var(--k-card)', border: '1.5px solid var(--k-border)', borderRadius: 14, padding: 14 }}>
              <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 8, fontWeight: 600 }}>PREVIEW NOTIFIKASI</p>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#00C896,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🔔</div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-text)', marginBottom: 2 }}>{title || '...'}</p>
                  <p style={{ fontSize: 13, color: 'var(--k-muted)', lineHeight: 1.5 }}>{body || '...'}</p>
                </div>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading || !title.trim() || !body.trim()} style={{
            padding: '14px', borderRadius: 14, border: 'none',
            background: loading ? '#9CA3AF' : 'var(--k-accent)',
            color: '#fff', fontSize: 15, fontWeight: 800,
            cursor: loading ? 'default' : 'pointer', marginTop: 4,
          }}>
            {loading ? 'Mengirim...' : `📢 Kirim ke ${TARGET_OPTIONS.find(o => o.value === target)?.label}`}
          </button>
        </form>
      </div>
    </AdminLayout>
  )
}
