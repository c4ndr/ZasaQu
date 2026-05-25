import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { storageUrl } from '../../services/api'

function fmtRp(v) { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }

export default function FoodJastipSessionsPage() {
  const navigate = useNavigate()
  const [sessions,     setSessions]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [vehicleFilter,setVehicleFilter] = useState('')
  const [userLat,      setUserLat]      = useState(null)
  const [userLng,      setUserLng]      = useState(null)

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude) },
      () => {}
    )
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (vehicleFilter) params.vehicle_type = vehicleFilter
    if (userLat)       params.lat = userLat
    if (userLng)       params.lng = userLng
    api.get('/food/jastip/sessions/available', { params })
      .then(r => setSessions(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [vehicleFilter, userLat, userLng])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', background: 'var(--k-card)',
        borderBottom: '1px solid var(--k-border)', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--k-text)' }}>‹</button>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>🛵 Sesi Hemat Ongkir</div>
            <div style={{ fontSize: 12, color: 'var(--k-sub)' }}>Pesan dari multi warung, bayar 1 ongkir</div>
          </div>
        </div>

        {/* Filter kendaraan */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[['', 'Semua'], ['motor', '🛵 Motor'], ['mobil', '🚗 Mobil']].map(([v, l]) => (
            <button key={v} onClick={() => setVehicleFilter(v)} style={{
              padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontWeight: vehicleFilter === v ? 700 : 400, fontSize: 13,
              background: vehicleFilter === v ? '#F97316' : 'var(--k-input)',
              color: vehicleFilter === v ? '#fff' : 'var(--k-sub)',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Penjelasan */}
      <div style={{
        margin: '16px 16px 0', padding: '14px 16px', borderRadius: 14,
        background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)',
      }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: '#F97316' }}>Bagaimana cara kerjanya?</div>
        <div style={{ fontSize: 12, color: 'var(--k-sub)', lineHeight: 1.6 }}>
          Mitra membuka sesi dengan rute tertentu. Kamu bisa pesan dari warung-warung yang berada di rute tersebut dan berbagi ongkir dengan sesama pembeli.
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-sub)' }}>Mencari sesi aktif...</div>
        ) : sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🛵</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Belum ada sesi aktif</div>
            <div style={{ fontSize: 13, color: 'var(--k-sub)', marginBottom: 20 }}>
              Mitra belum membuka sesi di sekitarmu. Coba lagi nanti atau pesan secara reguler.
            </div>
            <button onClick={() => navigate('/food')} style={{
              padding: '12px 28px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: '#F97316', color: '#fff', fontWeight: 700, fontSize: 14,
            }}>Pesan Reguler</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {sessions.map(s => <SessionCard key={s.id} session={s} navigate={navigate} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function SessionCard({ session: s, navigate }) {
  const merchants = [...new Map(
    (s.food_orders || []).map(o => [o.merchant_id, o.merchant])
  ).values()].filter(Boolean)

  const slotsLeft = s.max_orders - s.orders_count

  return (
    <div style={{
      borderRadius: 16, background: 'var(--k-card)',
      border: '1.5px solid var(--k-border)', overflow: 'hidden',
    }}>
      {/* Header sesi */}
      <div style={{
        padding: '14px 16px',
        background: 'linear-gradient(135deg, rgba(249,115,22,0.12) 0%, transparent 100%)',
        borderBottom: '1px solid var(--k-border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {s.vehicle_type === 'motor' ? '🛵' : '🚗'} {s.mitra?.name || 'Mitra'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--k-sub)', marginTop: 3 }}>
            📍 {s.origin_address || 'Lokasi awal'} → {s.destination_address || 'Tujuan'}
          </div>
        </div>
        <div style={{
          padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
          background: slotsLeft > 0 ? 'rgba(0,200,150,0.15)' : 'rgba(245,101,101,0.15)',
          color: slotsLeft > 0 ? '#00C896' : '#F56565',
        }}>
          {slotsLeft > 0 ? `${slotsLeft} slot tersisa` : 'Penuh'}
        </div>
      </div>

      {/* Warung dalam rute */}
      {merchants.length > 0 && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--k-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Warung dalam rute
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {merchants.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, overflow: 'hidden',
                  background: 'var(--k-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                }}>
                  {m.logo_path
                    ? <img src={storageUrl(m.logo_path)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : '🏪'
                  }
                </div>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{m.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info & CTA */}
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--k-sub)' }}>
          {s.orders_count}/{s.max_orders} order • Koridor {s.corridor_width}m
        </div>
        <button
          onClick={() => navigate('/food', { state: { autoJoinSession: s } })}
          disabled={slotsLeft === 0}
          style={{
            padding: '9px 18px', borderRadius: 10, border: 'none', cursor: slotsLeft > 0 ? 'pointer' : 'default',
            background: slotsLeft > 0 ? '#F97316' : 'var(--k-border)',
            color: '#fff', fontWeight: 700, fontSize: 13,
          }}
        >
          {slotsLeft > 0 ? 'Pilih Warung →' : 'Penuh'}
        </button>
      </div>
    </div>
  )
}
