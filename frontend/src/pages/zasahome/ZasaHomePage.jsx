import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { storageUrl } from '../../services/api'

const CATEGORIES = [
  { value: '',         label: 'Semua',    emoji: '🏠', grad: 'linear-gradient(135deg,#6366F1,#8B5CF6)' },
  { value: 'laundry',  label: 'Laundry',  emoji: '👕', grad: 'linear-gradient(135deg,#3B82F6,#06B6D4)' },
  { value: 'pijat',    label: 'Pijat',    emoji: '💆', grad: 'linear-gradient(135deg,#EC4899,#8B5CF6)' },
  { value: 'cleaning', label: 'Cleaning', emoji: '🧹', grad: 'linear-gradient(135deg,#10B981,#3B82F6)' },
  { value: 'tukang',   label: 'Tukang',   emoji: '🔧', grad: 'linear-gradient(135deg,#F59E0B,#EF4444)' },
  { value: 'cukur',    label: 'Cukur Panggilan', emoji: '💈', grad: 'linear-gradient(135deg,#0EA5E9,#6366F1)' },
  { value: 'lainnya',  label: 'Lainnya',  emoji: '⚡', grad: 'linear-gradient(135deg,#6366F1,#EC4899)' },
]

const SKILL_LV = {
  pemula:        { label: 'Pemula',        color: '#94A3B8' },
  terlatih:      { label: 'Terlatih',      color: '#22C55E' },
  berpengalaman: { label: 'Berpengalaman', color: '#3B82F6' },
  profesional:   { label: 'Profesional',   color: '#8B5CF6' },
  master:        { label: 'Master',         color: '#F59E0B' },
}

function startingPrice(provider) {
  const services = provider.services ?? []
  if (!services.length) return null
  const min = Math.min(...services.map(s => s.price))
  const unit = services.find(s => s.price === min)?.unit ?? ''
  return { min, unit }
}

export default function ZasaHomePage() {
  const [providers, setProviders] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [category,  setCategory]  = useState('')
  const navigate = useNavigate()
  const searchRef = useRef()

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

  const activeCat = CATEGORIES.find(c => c.value === category) ?? CATEGORIES[0]

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', paddingBottom: 80 }}>
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}} @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}`}</style>

      {/* ── Hero ── */}
      <div style={{ background: 'linear-gradient(160deg,#1e1b4b 0%,#312e81 55%,#4c1d95 100%)', padding: '52px 20px 28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', marginBottom: 20, padding: '6px 14px', borderRadius: 20 }}>
          ← Kembali
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, position: 'relative' }}>
          <div style={{ width: 52, height: 52, background: 'rgba(255,255,255,0.15)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, backdropFilter: 'blur(4px)', flexShrink: 0 }}>🏠</div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: -0.5 }}>ZasaHome</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 }}>Layanan rumah tangga terpercaya</p>
          </div>
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
          <input ref={searchRef}
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari layanan atau provider..."
            style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: 14, fontSize: 14, boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.15)', color: '#fff',
              outline: 'none', backdropFilter: 'blur(8px)' }}
          />
        </div>
      </div>

      {/* ── Kategori ── */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          {CATEGORIES.map(c => {
            const active = category === c.value
            return (
              <button key={c.value} onClick={() => setCategory(c.value)}
                style={{
                  padding: '14px 8px', borderRadius: 16, border: 'none', cursor: 'pointer',
                  background: active ? c.grad : 'var(--k-card)',
                  boxShadow: active ? '0 4px 16px rgba(99,102,241,0.3)' : 'none',
                  transition: 'all 0.2s',
                }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{c.emoji}</div>
                <div style={{ fontSize: 12, fontWeight: active ? 800 : 600, color: active ? '#fff' : 'var(--k-sub)' }}>{c.label}</div>
              </button>
            )
          })}
        </div>

        {/* Jumlah hasil */}
        {!loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>
              {category ? `${activeCat.emoji} ${activeCat.label}` : 'Semua Layanan'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>{providers.length} provider</p>
          </div>
        )}

        {/* Provider list */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ height: 120, borderRadius: 20, background: 'linear-gradient(90deg,var(--k-card) 25%,var(--k-input) 50%,var(--k-card) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
            ))}
          </div>
        ) : providers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-muted)', animation: 'fadeUp 0.4s ease' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <p style={{ fontWeight: 700, color: 'var(--k-text)', marginBottom: 6 }}>Tidak ditemukan</p>
            <p style={{ fontSize: 13 }}>Coba kata kunci atau kategori lain</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeUp 0.3s ease' }}>
            {providers.map(p => <ProviderCard key={p.id} provider={p} onClick={() => navigate(`/home/providers/${p.id}`)} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function ProviderCard({ provider: p, onClick }) {
  const catGrad = { laundry: 'linear-gradient(135deg,#3B82F6,#06B6D4)', pijat: 'linear-gradient(135deg,#EC4899,#8B5CF6)', cleaning: 'linear-gradient(135deg,#10B981,#3B82F6)', tukang: 'linear-gradient(135deg,#F59E0B,#EF4444)', cukur: 'linear-gradient(135deg,#0EA5E9,#6366F1)', lainnya: 'linear-gradient(135deg,#6366F1,#EC4899)' }
  const catEmoji = { laundry: '👕', pijat: '💆', cleaning: '🧹', tukang: '🔧', cukur: '💈', lainnya: '⚡' }
  const priceInfo = startingPrice(p)
  const lv = p.skill_level ? SKILL_LV[p.skill_level] : null

  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', background: 'var(--k-card)',
      border: '1px solid var(--k-border)', borderRadius: 20, padding: 0,
      cursor: 'pointer', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    }}>
      {/* Banner mini */}
      <div style={{ height: 70, background: p.banner_path ? undefined : (catGrad[p.category] ?? 'linear-gradient(135deg,#6366F1,#8B5CF6)'), position: 'relative', overflow: 'hidden' }}>
        {p.banner_path && <img src={storageUrl(p.banner_path, p.updated_at)} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' }} />
        {/* Status badge */}
        <span style={{ position: 'absolute', top: 8, right: 10, fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 20, background: p.is_open ? 'rgba(0,200,150,0.9)' : 'rgba(0,0,0,0.5)', color: '#fff', backdropFilter: 'blur(4px)' }}>
          {p.is_open ? '● Buka' : '○ Tutup'}
        </span>
      </div>

      {/* Info */}
      <div style={{ padding: '10px 14px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* Logo */}
        <div style={{ width: 48, height: 48, borderRadius: 14, overflow: 'hidden', flexShrink: 0, marginTop: -24, border: '3px solid var(--k-card)', background: 'var(--k-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', position: 'relative', zIndex: 1 }}>
          {p.logo_path ? <img src={storageUrl(p.logo_path, p.updated_at)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (catEmoji[p.category] ?? '🏠')}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--k-text)', lineHeight: 1.2 }}>{p.name}</p>
            {p.average_rating > 0 && (
              <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 700, flexShrink: 0 }}>⭐ {p.average_rating.toFixed(1)}</span>
            )}
          </div>

          <p style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {p.address}</p>

          {/* Tags: skill level + price */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {lv && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: `${lv.color}18`, color: lv.color, border: `1px solid ${lv.color}30` }}>
                {lv.label}
              </span>
            )}
            {p.experience_years > 0 && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: 'rgba(249,115,22,0.1)', color: '#F97316' }}>
                {p.experience_years} thn
              </span>
            )}
            {priceInfo && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'rgba(99,102,241,0.1)', color: '#6366F1' }}>
                mulai Rp {(priceInfo.min/1000).toLocaleString('id')}rb/{priceInfo.unit}
              </span>
            )}
            {!priceInfo && (
              <span style={{ fontSize: 10, color: 'var(--k-muted)', padding: '3px 9px', borderRadius: 20, background: 'var(--k-input)' }}>
                {p.services?.length ?? 0} layanan
              </span>
            )}
          </div>

          {/* Specializations preview */}
          {p.specializations?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              {p.specializations.slice(0, 3).map(s => (
                <span key={s} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'var(--k-input)', color: 'var(--k-sub)' }}>{s}</span>
              ))}
              {p.specializations.length > 3 && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'var(--k-input)', color: 'var(--k-muted)' }}>+{p.specializations.length - 3}</span>}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
