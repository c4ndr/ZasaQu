import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api, { storageUrl } from '../../services/api'

const UNIT_LABEL = { kg: '/kg', item: '/item', jam: '/jam', sesi: '/sesi' }

function estimatedDate(estimatedHours) {
  if (!estimatedHours) return null
  const d = new Date(Date.now() + estimatedHours * 3600000)
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })
}

export default function HomeProviderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [provider, setProvider] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [cart,     setCart]     = useState({}) // { serviceId: quantity }

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
      const step = 1
      const next = Math.max(0, cur + delta * step)
      if (next === 0) { const n = { ...c }; delete n[serviceId]; return n }
      return { ...c, [serviceId]: next }
    })
  }

  const totalItems = Object.keys(cart).length
  const totalPrice = provider?.services?.reduce((s, sv) => s + (cart[sv.id] ?? 0) * sv.price, 0) ?? 0

  function proceedOrder() {
    const items = Object.entries(cart).map(([sid, qty]) => {
      const sv = provider.services.find(s => s.id === parseInt(sid))
      return { service_id: sv.id, quantity: qty, service: sv }
    })
    navigate('/home/checkout', { state: { provider, items } })
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--k-muted)' }}>Memuat...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', paddingBottom: totalItems > 0 ? 100 : 20 }}>
      {/* Banner */}
      <div style={{ position: 'relative', height: 180, background: 'var(--k-card)', overflow: 'hidden' }}>
        {provider.banner_path
          ? <img src={storageUrl(provider.banner_path, provider.updated_at)} alt="banner"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#312e81,#4c1d95)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🏠</div>
        }
        <button onClick={() => navigate(-1)} style={{
          position: 'absolute', top: 48, left: 16, background: 'rgba(0,0,0,0.5)',
          border: 'none', borderRadius: 10, padding: '8px 12px', color: '#fff', cursor: 'pointer', fontSize: 14,
        }}>← Kembali</button>
      </div>

      {/* Info */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: -28, marginBottom: 16 }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, overflow: 'hidden', border: '3px solid var(--k-bg)',
            background: 'var(--k-card)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
            {provider.logo_path
              ? <img src={storageUrl(provider.logo_path, provider.updated_at)} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : '🏠'
            }
          </div>
          <div style={{ flex: 1, paddingBottom: 4 }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--k-text)', marginBottom: 2 }}>{provider.name}</h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                background: provider.is_open ? 'rgba(0,200,150,0.12)' : 'rgba(160,160,188,0.1)',
                color: provider.is_open ? '#00C896' : 'var(--k-muted)' }}>
                {provider.is_open ? '● Buka' : '● Tutup'}
              </span>
              {provider.average_rating > 0 && (
                <span style={{ fontSize: 12, color: '#F6AD55', fontWeight: 600 }}>⭐ {provider.average_rating.toFixed(1)}</span>
              )}
            </div>
          </div>
        </div>

        {provider.description && (
          <p style={{ fontSize: 13, color: 'var(--k-muted)', marginBottom: 12, lineHeight: 1.6 }}>{provider.description}</p>
        )}

        {/* Kredensial — level, pengalaman, sertifikat */}
        {(provider.skill_level || provider.experience_years || provider.certificates?.length > 0) && (
          <div style={{ background: 'var(--k-input)', border: '1px solid var(--k-border)', borderRadius: 14, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: provider.certificates?.length > 0 ? 10 : 0 }}>
              {provider.skill_level && (() => {
                const LV = { pemula: { label: 'Pemula', color: '#94A3B8', badge: '⭐' }, terlatih: { label: 'Terlatih', color: '#22C55E', badge: '⭐⭐' }, berpengalaman: { label: 'Berpengalaman', color: '#3B82F6', badge: '⭐⭐⭐' }, profesional: { label: 'Profesional', color: '#8B5CF6', badge: '⭐⭐⭐⭐' }, master: { label: 'Master', color: '#F59E0B', badge: '⭐⭐⭐⭐⭐' } }
                const lv = LV[provider.skill_level]
                if (!lv) return null
                return (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, fontWeight: 700, fontSize: 12, background: `${lv.color}18`, color: lv.color, border: `1px solid ${lv.color}40` }}>
                    {lv.badge} {lv.label}
                  </span>
                )
              })()}
              {provider.experience_years > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, fontWeight: 700, fontSize: 12, background: 'rgba(249,115,22,0.1)', color: '#F97316', border: '1px solid rgba(249,115,22,0.3)' }}>
                  📅 {provider.experience_years} tahun pengalaman
                </span>
              )}
            </div>
            {provider.certificates?.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {provider.certificates.filter(Boolean).map((cert, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ fontSize: 14, marginTop: 1 }}>🎖️</span>
                    <p style={{ fontSize: 12, color: 'var(--k-text)', lineHeight: 1.4 }}>{cert}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Spesialisasi */}
        {provider.specializations?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {provider.specializations.map(s => (
              <span key={s} style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: 'rgba(99,102,241,0.1)', color: '#6366F1',
                border: '1px solid rgba(99,102,241,0.25)',
              }}>
                {s}
              </span>
            ))}
          </div>
        )}

        <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: provider.open_time ? 6 : 20 }}>📍 {provider.address}</p>
        {provider.open_time && (
          <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 20 }}>🕐 {provider.open_time?.slice(0,5)} – {provider.close_time?.slice(0,5)}</p>
        )}

        {/* Services */}
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--k-text)', marginBottom: 12 }}>Layanan Tersedia</h2>

        {!provider.is_open && (
          <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(245,101,101,0.08)',
            border: '1px solid rgba(245,101,101,0.2)', marginBottom: 16, fontSize: 13, color: '#F56565' }}>
            ⚠️ Toko sedang tutup. Anda tetap bisa memesan, akan diproses saat buka.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {provider.services?.length === 0 ? (
            <p style={{ color: 'var(--k-muted)', fontSize: 13 }}>Belum ada layanan tersedia.</p>
          ) : provider.services?.map(sv => {
            const qty = cart[sv.id] ?? 0
            const isKg = sv.unit === 'kg'
            const estDate = estimatedDate(sv.estimated_hours)
            return (
              <div key={sv.id} style={{
                background: 'var(--k-card)', border: qty > 0 ? '1.5px solid #6366F1' : '1px solid var(--k-border)',
                borderRadius: 14, padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, color: 'var(--k-text)', fontSize: 14, marginBottom: 2 }}>{sv.name}</p>
                    {sv.description && <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 4 }}>{sv.description}</p>}
                    <p style={{ fontSize: 13, color: '#6366F1', fontWeight: 700, marginBottom: 3 }}>
                      Rp {sv.price.toLocaleString('id')}{UNIT_LABEL[sv.unit] ?? ''}
                    </p>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {sv.estimated_hours && (
                        <span style={{ fontSize: 11, color: 'var(--k-muted)' }}>⏱ ~{sv.estimated_hours} jam</span>
                      )}
                      {sv.min_order && (
                        <span style={{ fontSize: 11, color: 'var(--k-muted)' }}>Min {sv.min_order} {sv.unit}</span>
                      )}
                    </div>
                    {estDate && qty > 0 && (
                      <p style={{ fontSize: 11, color: '#00C896', marginTop: 4, fontWeight: 600 }}>
                        Estimasi selesai: {estDate}
                      </p>
                    )}
                  </div>

                  {/* Quantity control */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {isKg ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {qty > 0 && (
                          <button onClick={() => setKgQty(sv.id, 0, sv.min_order)} style={{
                            width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: 'rgba(245,101,101,0.12)', color: '#F56565', fontSize: 14, fontWeight: 700,
                          }}>✕</button>
                        )}
                        <div style={{ position: 'relative' }}>
                          <input
                            type="number"
                            value={qty || ''}
                            onChange={e => setKgQty(sv.id, e.target.value, sv.min_order)}
                            placeholder={`${sv.min_order ?? 1}`}
                            min={sv.min_order ?? 0.1}
                            step={0.5}
                            style={{
                              width: 64, height: 34, borderRadius: 10, border: '1.5px solid #6366F1',
                              background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 14,
                              fontWeight: 700, textAlign: 'center', outline: 'none', padding: '0 4px',
                            }}
                          />
                          <span style={{ position: 'absolute', right: 5, bottom: 3, fontSize: 9, color: 'var(--k-muted)' }}>kg</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        {qty > 0 && (
                          <>
                            <button onClick={() => adjustCart(sv.id, -1, sv.min_order)} style={{
                              width: 32, height: 32, borderRadius: 10, border: 'none', cursor: 'pointer',
                              background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 18, fontWeight: 700,
                            }}>−</button>
                            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--k-text)', minWidth: 22, textAlign: 'center' }}>
                              {qty}
                            </span>
                          </>
                        )}
                        <button onClick={() => adjustCart(sv.id, 1, sv.min_order)} style={{
                          width: 32, height: 32, borderRadius: 10, border: 'none', cursor: 'pointer',
                          background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', fontSize: 18, fontWeight: 700,
                        }}>+</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom bar */}
      {totalItems > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          padding: '16px 20px', background: 'var(--k-card)',
          borderTop: '1px solid var(--k-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>{totalItems} layanan dipilih</p>
            <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--k-text)' }}>Rp {totalPrice.toLocaleString('id')}</p>
          </div>
          <button onClick={proceedOrder} style={{
            padding: '12px 24px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff',
            fontWeight: 700, fontSize: 14,
          }}>Pesan Sekarang →</button>
        </div>
      )}
    </div>
  )
}
