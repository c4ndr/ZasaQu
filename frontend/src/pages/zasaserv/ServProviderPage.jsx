import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api, { storageUrl } from '../../services/api'

const SKILL_LV = {
  pemula: 'Pemula', terlatih: 'Terlatih', berpengalaman: 'Berpengalaman',
  profesional: 'Profesional', master: 'Master',
}
const UNIT_LABEL = { item: 'item', jam: 'jam', sesi: 'sesi', titik: 'titik', meter: 'meter' }

export default function ServProviderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [provider,             setProvider]             = useState(null)
  const [loading,              setLoading]              = useState(true)
  const [selected,             setSelected]             = useState({})
  const [booking,              setBooking]              = useState(false)
  const [consultationEnabled,  setConsultationEnabled]  = useState(false)

  useEffect(() => {
    api.get(`/serv/providers/${id}`)
      .then(r => {
        setProvider(r.data.data)
        setConsultationEnabled(r.data.meta?.consultation_enabled ?? false)
      })
      .catch(() => navigate('/serv', { replace: true }))
      .finally(() => setLoading(false))
  }, [id])

  function changeQty(serviceId, delta) {
    setSelected(prev => {
      const cur = (prev[serviceId] ?? 0) + delta
      if (cur <= 0) { const { [serviceId]: _, ...rest } = prev; return rest }
      return { ...prev, [serviceId]: cur }
    })
  }

  const totalItems   = Object.values(selected).reduce((s, q) => s + q, 0)
  const totalPrice   = provider?.services?.reduce((s, sv) => s + (selected[sv.id] ?? 0) * sv.price, 0) ?? 0

  function handleBooking() {
    if (!totalItems) return
    if (!user) { navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`); return }
    const items = Object.entries(selected).map(([service_id, quantity]) => ({
      service_id: parseInt(service_id), quantity,
    }))
    navigate('/serv/checkout', { state: { provider, items, totalPrice } })
  }

  if (loading) return <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--k-muted)' }}>Memuat...</div>
  if (!provider) return null

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', paddingBottom: 120 }}>
      {/* Banner */}
      <div style={{ height: 180, background: provider.banner_path ? `url(${storageUrl(provider.banner_path)}) center/cover` : 'linear-gradient(135deg,#064e3b,#059669)', position: 'relative' }}>
        <button onClick={() => navigate(-1)} style={{ position: 'absolute', top: 52, left: 16, background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff', borderRadius: 20, padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}>
          ← Kembali
        </button>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* Header card */}
        <div style={{ background: 'var(--k-card)', borderRadius: 18, padding: 16, marginTop: -30, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16, position: 'relative', zIndex: 2 }}>
          <div style={{ width: 60, height: 60, borderRadius: 14, background: 'linear-gradient(135deg,#064e3b,#059669)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {provider.logo_path
              ? <img src={storageUrl(provider.logo_path)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 26 }}>🔧</span>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{provider.name}</div>
            <div style={{ fontSize: 12, color: 'var(--k-muted)', marginTop: 2 }}>{provider.address}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              {provider.skill_level && (
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(5,150,105,0.1)', color: '#059669', fontWeight: 600 }}>{SKILL_LV[provider.skill_level]}</span>
              )}
              {provider.experience_years > 0 && (
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'var(--k-input)', color: 'var(--k-muted)', fontWeight: 500 }}>{provider.experience_years}th pengalaman</span>
              )}
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700, color: provider.is_open ? '#22C55E' : '#94A3B8', background: provider.is_open ? 'rgba(34,197,94,0.1)' : 'var(--k-input)' }}>
                {provider.is_open ? '● Buka' : '○ Tutup'}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#F59E0B' }}>★ {provider.average_rating > 0 ? provider.average_rating.toFixed(1) : '–'}</div>
            <div style={{ fontSize: 10, color: 'var(--k-muted)' }}>{provider.total_ratings} ulasan</div>
          </div>
        </div>

        {/* Description */}
        {provider.description && (
          <div style={{ background: 'var(--k-card)', borderRadius: 14, padding: 14, marginBottom: 12, fontSize: 13, color: 'var(--k-text)', lineHeight: 1.6 }}>
            {provider.description}
          </div>
        )}

        {/* Specializations */}
        {provider.specializations?.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Spesialisasi</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {provider.specializations.map((s, i) => (
                <span key={i} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 12, background: 'rgba(5,150,105,0.1)', color: '#059669', fontWeight: 600 }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Tombol Konsultasi */}
        {consultationEnabled && (
          <button
            onClick={() => navigate(`/serv/providers/${provider.id}/consult`, { state: { otherName: provider.name } })}
            style={{
              width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12,
              background: 'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(99,102,241,0.05))',
              border: '1.5px solid rgba(99,102,241,0.3)',
              borderRadius: 14, padding: '14px 16px', marginBottom: 14, cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 28, flexShrink: 0 }}>💬</span>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: '#6366F1' }}>Konsultasi Sebelum Order</p>
              <p style={{ fontSize: 12, color: 'var(--k-muted)', marginTop: 2 }}>Tanya ketersediaan, estimasi biaya, atau jadwal</p>
            </div>
            <span style={{ fontSize: 18, color: '#6366F1', flexShrink: 0 }}>›</span>
          </button>
        )}

        {/* Services */}
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Layanan Tersedia</div>
        {(provider.services ?? []).map(sv => (
          <div key={sv.id} style={{ background: 'var(--k-card)', borderRadius: 14, padding: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{sv.name}</div>
              {sv.description && <div style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 2 }}>{sv.description}</div>}
              <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#059669', fontSize: 14 }}>Rp {sv.price.toLocaleString('id')}</span>
                <span style={{ fontSize: 11, color: 'var(--k-muted)' }}>/{UNIT_LABEL[sv.unit] ?? sv.unit}</span>
                {sv.estimated_hours && <span style={{ fontSize: 10, color: 'var(--k-muted)' }}>~{sv.estimated_hours}jam</span>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => changeQty(sv.id, -1)} disabled={!selected[sv.id]} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', cursor: 'pointer', background: selected[sv.id] ? '#EF4444' : 'var(--k-input)', color: selected[sv.id] ? '#fff' : 'var(--k-muted)', fontWeight: 700, fontSize: 16 }}>−</button>
              <span style={{ fontWeight: 700, fontSize: 15, minWidth: 20, textAlign: 'center' }}>{selected[sv.id] ?? 0}</span>
              <button onClick={() => changeQty(sv.id, 1)} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', cursor: 'pointer', background: '#059669', color: '#fff', fontWeight: 700, fontSize: 16 }}>+</button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      {totalItems > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px', background: 'var(--k-card)', borderTop: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--k-muted)' }}>{totalItems} layanan dipilih</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#059669' }}>Rp {totalPrice.toLocaleString('id')}</div>
          </div>
          <button onClick={handleBooking} disabled={booking} style={{ padding: '12px 24px', background: '#059669', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Pesan Sekarang
          </button>
        </div>
      )}
    </div>
  )
}
