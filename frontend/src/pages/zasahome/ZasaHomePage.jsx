import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { storageUrl } from '../../services/api'

const CATEGORIES = [
  { value: '',        label: 'Semua',    emoji: '🏠' },
  { value: 'laundry', label: 'Laundry',  emoji: '👕' },
  { value: 'pijat',   label: 'Pijat',    emoji: '💆' },
  { value: 'cleaning',label: 'Cleaning', emoji: '🧹' },
  { value: 'tukang',  label: 'Tukang',   emoji: '🔧' },
  { value: 'lainnya', label: 'Lainnya',  emoji: '⚡' },
]

export default function ZasaHomePage() {
  const [providers, setProviders] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [category,  setCategory]  = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search)   params.set('search', search)
    if (category) params.set('category', category)

    api.get('/home/providers?' + params)
      .then(r => setProviders(r.data.data ?? []))
      .catch(() => setProviders([]))
      .finally(() => setLoading(false))
  }, [search, category])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: '52px 20px 20px', background: 'linear-gradient(160deg,#0F1E25 0%,var(--k-bg) 100%)' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--k-muted)', fontSize: 14, cursor: 'pointer', marginBottom: 16, padding: 0 }}>
          ← Kembali
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🏠</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--k-text)', lineHeight: 1.2 }}>ZasaHome</h1>
            <p style={{ color: 'var(--k-muted)', fontSize: 13 }}>Layanan rumah tangga terpercaya</p>
          </div>
        </div>
        {/* Search */}
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari layanan atau toko..."
          style={{ width: '100%', padding: '11px 14px', borderRadius: 12, fontSize: 14, boxSizing: 'border-box',
            background: 'var(--k-card)', border: '1px solid var(--k-border)', color: 'var(--k-text)', outline: 'none' }}
        />
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* Category filter */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 20, WebkitOverflowScrolling: 'touch' }}>
          {CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setCategory(c.value)}
              style={{
                flexShrink: 0, padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                background: category === c.value ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : 'var(--k-card)',
                color: category === c.value ? '#fff' : 'var(--k-sub)',
              }}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {/* Provider list */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ height: 88, borderRadius: 16, background: 'var(--k-card)', animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : providers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏠</div>
            <p style={{ fontWeight: 600 }}>Belum ada provider di kategori ini</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {providers.map(p => (
              <ProviderCard key={p.id} provider={p} onClick={() => navigate(`/home/providers/${p.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ProviderCard({ provider: p, onClick }) {
  const catEmoji = { laundry: '👕', pijat: '💆', cleaning: '🧹', tukang: '🔧', lainnya: '⚡' }
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', background: 'var(--k-card)',
      border: '1px solid var(--k-border)', borderRadius: 16, padding: 14,
      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, overflow: 'hidden', flexShrink: 0,
        background: 'var(--k-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
        {p.logo_path
          ? <img src={storageUrl(p.logo_path, p.updated_at)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : catEmoji[p.category] ?? '🏠'
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--k-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
            background: p.is_open ? 'rgba(0,200,150,0.12)' : 'rgba(160,160,188,0.12)',
            color: p.is_open ? '#00C896' : 'var(--k-muted)',
          }}>{p.is_open ? 'Buka' : 'Tutup'}</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.address}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {p.average_rating > 0 && (
            <span style={{ fontSize: 12, color: '#F6AD55', fontWeight: 600 }}>⭐ {p.average_rating.toFixed(1)}</span>
          )}
          <span style={{ fontSize: 12, color: 'var(--k-muted)' }}>{p.services?.length ?? 0} layanan</span>
        </div>
      </div>
      <span style={{ color: 'var(--k-muted)', fontSize: 16 }}>›</span>
    </button>
  )
}
