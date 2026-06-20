import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { storageUrl } from '../../services/api'

const CATEGORIES = [
  { value: '',          label: 'Semua',        emoji: '🔧', grad: 'linear-gradient(135deg,#059669,#10B981)' },
  { value: 'ac',        label: 'Servis AC',    emoji: '❄️', grad: 'linear-gradient(135deg,#3B82F6,#06B6D4)' },
  { value: 'elektronik',label: 'Elektronik',   emoji: '📺', grad: 'linear-gradient(135deg,#8B5CF6,#6366F1)' },
  { value: 'listrik',   label: 'Listrik',      emoji: '⚡', grad: 'linear-gradient(135deg,#F59E0B,#EF4444)' },
  { value: 'air',       label: 'Pipa & Air',   emoji: '💧', grad: 'linear-gradient(135deg,#0EA5E9,#6366F1)' },
  { value: 'bangunan',  label: 'Bangunan',     emoji: '🏗️', grad: 'linear-gradient(135deg,#78716C,#44403C)' },
  { value: 'jahit',     label: 'Jahit/Permak', emoji: '🧵', grad: 'linear-gradient(135deg,#EC4899,#F43F5E)' },
  { value: 'cctv',      label: 'Pasang CCTV',  emoji: '📹', grad: 'linear-gradient(135deg,#374151,#6B7280)' },
  { value: 'lainnya',   label: 'Lainnya',      emoji: '🛠️', grad: 'linear-gradient(135deg,#6366F1,#EC4899)' },
]

const SKILL_LV = {
  pemula:        { label: 'Pemula',        color: '#94A3B8' },
  terlatih:      { label: 'Terlatih',      color: '#22C55E' },
  berpengalaman: { label: 'Berpengalaman', color: '#3B82F6' },
  profesional:   { label: 'Profesional',   color: '#8B5CF6' },
  master:        { label: 'Master',        color: '#F59E0B' },
}

function startingPrice(provider) {
  const services = provider.services ?? []
  if (!services.length) return null
  const min = Math.min(...services.map(s => s.price))
  return min
}

export default function ZasaServPage() {
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
    api.get('/serv/providers?' + params)
      .then(r => setProviders(r.data.data ?? []))
      .catch(() => setProviders([]))
      .finally(() => setLoading(false))
  }, [search, category])

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', paddingBottom: 80 }}>
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}} @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}`}</style>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(160deg,#064e3b 0%,#065f46 55%,#047857 100%)', padding: '52px 20px 28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', marginBottom: 20, padding: '6px 14px', borderRadius: 20 }}>
          ← Kembali
        </button>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 4 }}>🔧 ZasaServis</div>
        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>Teknisi & servis panggil ke lokasi Anda</div>

        {/* Search */}
        <div style={{ marginTop: 18, position: 'relative' }}>
          <input
            placeholder="Cari teknisi atau servis..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', borderRadius: 14, border: 'none', fontSize: 14, background: 'rgba(255,255,255,0.95)', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Category chips */}
      <div style={{ display: 'flex', gap: 8, padding: '14px 16px 0', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {CATEGORIES.map(c => (
          <button key={c.value} onClick={() => setCategory(c.value)} style={{
            flexShrink: 0, padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: category === c.value ? '#059669' : 'var(--k-card)',
            color: category === c.value ? '#fff' : 'var(--k-text)',
            boxShadow: category === c.value ? '0 2px 8px rgba(5,150,105,0.3)' : 'none',
          }}>
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {/* Provider list */}
      <div style={{ padding: '16px 16px 0' }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 120, borderRadius: 16, marginBottom: 12, background: 'linear-gradient(90deg,var(--k-card) 25%,var(--k-input) 50%,var(--k-card) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
          ))
        ) : providers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--k-muted)', fontSize: 14 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔧</div>
            Belum ada provider ditemukan
          </div>
        ) : providers.map((p, i) => {
          const skill  = SKILL_LV[p.skill_level] ?? SKILL_LV.terlatih
          const minPrice = startingPrice(p)
          const cat    = CATEGORIES.find(c => c.value === p.category) ?? CATEGORIES[CATEGORIES.length - 1]
          return (
            <div
              key={p.id}
              onClick={() => navigate(`/serv/providers/${p.id}`)}
              style={{ background: 'var(--k-card)', borderRadius: 16, padding: 16, marginBottom: 12, display: 'flex', gap: 14, cursor: 'pointer', animation: `fadeUp 0.3s ${i * 0.05}s both`, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
            >
              {/* Logo */}
              <div style={{ width: 64, height: 64, borderRadius: 14, flexShrink: 0, overflow: 'hidden', background: cat.grad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {p.logo_path
                  ? <img src={storageUrl(p.logo_path)} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 26 }}>{cat.emoji}</span>}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 6 }}>{p.address ?? 'Lokasi belum diisi'}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(5,150,105,0.12)', color: '#059669', fontWeight: 600 }}>{cat.label}</span>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(100,100,100,0.1)', color: skill.color, fontWeight: 600 }}>{skill.label}</span>
                  {p.experience_years > 0 && (
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'var(--k-input)', color: 'var(--k-muted)', fontWeight: 500 }}>{p.experience_years}th pengalaman</span>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end', marginBottom: 4 }}>
                  <span style={{ color: '#F59E0B', fontSize: 12 }}>★</span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{p.average_rating > 0 ? p.average_rating.toFixed(1) : '–'}</span>
                </div>
                {minPrice != null && (
                  <div style={{ fontSize: 11, color: 'var(--k-muted)' }}>
                    Mulai<br/>
                    <span style={{ fontWeight: 700, color: '#059669', fontSize: 13 }}>
                      Rp {minPrice.toLocaleString('id')}
                    </span>
                  </div>
                )}
                <div style={{ fontSize: 10, marginTop: 4, color: p.is_open ? '#22C55E' : '#94A3B8', fontWeight: 600 }}>
                  {p.is_open ? '● Buka' : '○ Tutup'}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
