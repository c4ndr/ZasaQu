import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api, { storageUrl } from '../../services/api'

const UNIT_LABEL = { kg: '/kg', item: '/item', jam: '/jam', sesi: '/sesi' }

const CAT_EMOJI = { laundry: '👕', pijat: '💆', cleaning: '🧹', tukang: '🔧', cukur: '💈', lainnya: '⚡' }

const CAT_GRAD = {
  laundry:  'linear-gradient(135deg,#3B82F6,#06B6D4)',
  pijat:    'linear-gradient(135deg,#EC4899,#8B5CF6)',
  cleaning: 'linear-gradient(135deg,#10B981,#3B82F6)',
  tukang:   'linear-gradient(135deg,#F59E0B,#EF4444)',
  cukur:    'linear-gradient(135deg,#0EA5E9,#6366F1)',
  lainnya:  'linear-gradient(135deg,#6366F1,#EC4899)',
}

const SKILL_LV = {
  pemula:        { label: 'Pemula',        color: '#94A3B8', stars: '⭐' },
  terlatih:      { label: 'Terlatih',      color: '#22C55E', stars: '⭐⭐' },
  berpengalaman: { label: 'Berpengalaman', color: '#3B82F6', stars: '⭐⭐⭐' },
  profesional:   { label: 'Profesional',   color: '#8B5CF6', stars: '⭐⭐⭐⭐' },
  master:        { label: 'Master',        color: '#F59E0B', stars: '⭐⭐⭐⭐⭐' },
}

function estimatedDate(estimatedHours) {
  if (!estimatedHours) return null
  const d = new Date(Date.now() + estimatedHours * 3600000)
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })
}

export default function HomeProviderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [provider, setProvider] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [cart,     setCart]     = useState({})

  useEffect(() => {
    api.get(`/home/providers/${id}`)
      .then(r => setProvider(r.data.data))
      .catch(() => navigate('/home'))
      .finally(() => setLoading(false))
  }, [id])

  function setKgQty(serviceId, val, min_order) {
    const n = parseFloat(val)
    if (isNaN(n) || n <= 0) { setCart(c => { const nx = { ...c }; delete nx[serviceId]; return nx }); return }
    setCart(c => ({ ...c, [serviceId]: Math.max(n, min_order ?? 0.1) }))
  }

  function adjustCart(serviceId, delta, min_order) {
    setCart(c => {
      const cur  = c[serviceId] ?? 0
      const next = Math.max(0, cur + delta)
      if (next === 0) { const n = { ...c }; delete n[serviceId]; return n }
      return { ...c, [serviceId]: next }
    })
  }

  const totalItems = Object.keys(cart).length
  const totalPrice = provider?.services?.reduce((s, sv) => s + (cart[sv.id] ?? 0) * sv.price, 0) ?? 0

  function proceedOrder() {
    if (!user) { navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`); return }
    const items = Object.entries(cart).map(([sid, qty]) => {
      const sv = provider.services.find(s => s.id === parseInt(sid))
      return { service_id: sv.id, quantity: qty, service: sv }
    })
    navigate('/home/checkout', { state: { provider, items } })
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #6366F1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const grad = CAT_GRAD[provider.category] ?? 'linear-gradient(135deg,#6366F1,#8B5CF6)'
  const lv   = provider.skill_level ? SKILL_LV[provider.skill_level] : null

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', paddingBottom: totalItems > 0 ? 110 : 32 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`}</style>

      {/* ── Banner hero ── */}
      <div style={{ position: 'relative', height: 220, overflow: 'hidden' }}>
        {provider.banner_path
          ? <img src={storageUrl(provider.banner_path, provider.updated_at)} alt="banner" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, opacity: 0.6 }}>
              {CAT_EMOJI[provider.category] ?? '🏠'}
            </div>
        }
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 40%, transparent 100%)' }} />
        <button onClick={() => navigate(-1)} style={{
          position: 'absolute', top: 48, left: 16, background: 'rgba(0,0,0,0.45)',
          border: 'none', borderRadius: 20, padding: '7px 16px', color: '#fff', cursor: 'pointer', fontSize: 13, backdropFilter: 'blur(4px)',
        }}>← Kembali</button>

        {/* Status pill */}
        <span style={{
          position: 'absolute', top: 52, right: 16, fontSize: 12, fontWeight: 800,
          padding: '5px 14px', borderRadius: 20, backdropFilter: 'blur(8px)',
          background: provider.is_open ? 'rgba(0,200,150,0.85)' : 'rgba(0,0,0,0.55)',
          color: '#fff',
        }}>
          {provider.is_open ? '● Buka' : '○ Tutup'}
        </span>
      </div>

      {/* ── Info card floating ── */}
      <div style={{ margin: '0 16px', marginTop: -36, position: 'relative', zIndex: 10, animation: 'fadeUp 0.4s ease' }}>
        <div style={{ background: 'var(--k-card)', borderRadius: 20, padding: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid var(--k-border)' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            {/* Logo */}
            <div style={{ width: 60, height: 60, borderRadius: 16, overflow: 'hidden', flexShrink: 0, border: '2px solid var(--k-border)', background: 'var(--k-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
              {provider.logo_path ? <img src={storageUrl(provider.logo_path, provider.updated_at)} alt="logo" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (CAT_EMOJI[provider.category] ?? '🏠')}
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 18, fontWeight: 900, color: 'var(--k-text)', lineHeight: 1.2, marginBottom: 4 }}>{provider.name}</h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {provider.average_rating > 0 && (
                  <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 700 }}>⭐ {provider.average_rating.toFixed(1)}</span>
                )}
                {lv && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: `${lv.color}18`, color: lv.color, border: `1px solid ${lv.color}30` }}>
                    {lv.stars} {lv.label}
                  </span>
                )}
                {provider.experience_years > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: 'rgba(249,115,22,0.1)', color: '#F97316' }}>
                    {provider.experience_years} thn pengalaman
                  </span>
                )}
              </div>
            </div>
          </div>

          {provider.description && (
            <p style={{ fontSize: 13, color: 'var(--k-muted)', marginTop: 12, lineHeight: 1.6 }}>{provider.description}</p>
          )}

          <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>📍 {provider.address}</p>
            {provider.open_time && (
              <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>🕐 {provider.open_time?.slice(0,5)}–{provider.close_time?.slice(0,5)}</p>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 0', animation: 'fadeUp 0.5s ease' }}>
        {/* Kredensial */}
        {(provider.skill_level || provider.experience_years || provider.certificates?.length > 0) && (
          <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: '14px', marginBottom: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Kredensial</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: provider.certificates?.length > 0 ? 10 : 0 }}>
              {lv && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, fontWeight: 700, fontSize: 12, background: `${lv.color}18`, color: lv.color, border: `1px solid ${lv.color}40` }}>
                  {lv.stars} {lv.label}
                </span>
              )}
              {provider.experience_years > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, fontWeight: 700, fontSize: 12, background: 'rgba(249,115,22,0.1)', color: '#F97316', border: '1px solid rgba(249,115,22,0.3)' }}>
                  📅 {provider.experience_years} tahun pengalaman
                </span>
              )}
            </div>
            {provider.certificates?.filter(Boolean).map((cert, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14 }}>🎖️</span>
                <p style={{ fontSize: 12, color: 'var(--k-text)', lineHeight: 1.4 }}>{cert}</p>
              </div>
            ))}
          </div>
        )}

        {/* Spesialisasi */}
        {provider.specializations?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {provider.specializations.map(s => (
              <span key={s} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(99,102,241,0.1)', color: '#6366F1', border: '1px solid rgba(99,102,241,0.25)' }}>
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Tutup warning */}
        {!provider.is_open && (
          <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(245,101,101,0.08)', border: '1px solid rgba(245,101,101,0.2)', marginBottom: 14, fontSize: 13, color: '#F56565', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>⚠️</span> Sedang tutup — Anda tetap bisa memesan, diproses saat buka.
          </div>
        )}

        {/* ── Layanan ── */}
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Layanan Tersedia</p>

        {provider.services?.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--k-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🛠️</div>
            <p>Belum ada layanan tersedia.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {provider.services?.map(sv => {
              const qty    = cart[sv.id] ?? 0
              const isKg   = sv.unit === 'kg'
              const active = qty > 0
              const estDate = active ? estimatedDate(sv.estimated_hours) : null

              return (
                <div key={sv.id} style={{
                  background: 'var(--k-card)',
                  border: active ? '2px solid #6366F1' : '1px solid var(--k-border)',
                  borderRadius: 18, overflow: 'hidden',
                  boxShadow: active ? '0 4px 20px rgba(99,102,241,0.15)' : '0 1px 6px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s',
                }}>
                  {/* Accent bar */}
                  <div style={{ height: 4, background: active ? grad : 'var(--k-border)' }} />

                  <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, color: 'var(--k-text)', fontSize: 15, marginBottom: 3 }}>{sv.name}</p>
                      {sv.description && <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 6, lineHeight: 1.5 }}>{sv.description}</p>}
                      <p style={{ fontSize: 15, fontWeight: 800, color: '#6366F1', marginBottom: 6 }}>
                        Rp {sv.price.toLocaleString('id')}{UNIT_LABEL[sv.unit] ?? ''}
                      </p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {sv.estimated_hours && (
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'var(--k-input)', color: 'var(--k-muted)' }}>⏱ ~{sv.estimated_hours} jam</span>
                        )}
                        {sv.min_order && (
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'var(--k-input)', color: 'var(--k-muted)' }}>Min {sv.min_order} {sv.unit}</span>
                        )}
                        {estDate && (
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'rgba(0,200,150,0.1)', color: '#00C896' }}>📅 Selesai {estDate}</span>
                        )}
                      </div>
                    </div>

                    {/* Quantity control */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {isKg ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {qty > 0 && (
                            <button onClick={() => setKgQty(sv.id, 0)} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(245,101,101,0.12)', color: '#F56565', fontSize: 14, fontWeight: 700 }}>✕</button>
                          )}
                          <div style={{ position: 'relative' }}>
                            <input type="number" value={qty || ''} onChange={e => setKgQty(sv.id, e.target.value, sv.min_order)}
                              placeholder={`${sv.min_order ?? 1}`} min={sv.min_order ?? 0.1} step={0.5}
                              style={{ width: 68, height: 36, borderRadius: 10, border: `2px solid ${active ? '#6366F1' : 'var(--k-border)'}`, background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 15, fontWeight: 700, textAlign: 'center', outline: 'none', padding: '0 4px' }}
                            />
                            <span style={{ position: 'absolute', right: 5, bottom: 3, fontSize: 9, color: 'var(--k-muted)' }}>kg</span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {qty > 0 && (
                            <>
                              <button onClick={() => adjustCart(sv.id, -1)} style={{ width: 32, height: 32, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 20, fontWeight: 700, lineHeight: 1 }}>−</button>
                              <span style={{ fontWeight: 800, fontSize: 16, color: '#6366F1', minWidth: 24, textAlign: 'center' }}>{qty}</span>
                            </>
                          )}
                          <button onClick={() => adjustCart(sv.id, 1)} style={{ width: 32, height: 32, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', fontSize: 20, fontWeight: 700, lineHeight: 1 }}>+</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Sticky cart bar ── */}
      {totalItems > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          padding: '12px 20px 20px', background: 'var(--k-card)', borderTop: '1px solid var(--k-border)',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
        }}>
          <button onClick={proceedOrder} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderRadius: 16, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#6366F1,#8B5CF6)',
            boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 8, padding: '2px 8px', fontSize: 12, fontWeight: 800, color: '#fff' }}>{totalItems}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Pesan Sekarang</span>
            </span>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>Rp {totalPrice.toLocaleString('id')} →</span>
          </button>
        </div>
      )}
    </div>
  )
}
