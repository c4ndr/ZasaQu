import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../components/BottomNav'
import api, { storageUrl } from '../../services/api'

function fmtRating(r) { return r > 0 ? r.toFixed(1) : '—' }

const CAT_TABS = [
  { key: '',             label: 'Semua'          },
  { key: 'makanan_berat',label: 'Makanan'        },
  { key: 'minuman',      label: 'Minuman'        },
  { key: 'snack',        label: 'Snack'          },
]

export default function FoodPage() {
  const navigate = useNavigate()
  const [merchants,       setMerchants]       = useState([])
  const [loading,         setLoading]         = useState(true)
  const [category,        setCategory]        = useState('')
  const [search,          setSearch]          = useState('')
  const [activeSessions,  setActiveSessions]  = useState([])
  const [userLat,         setUserLat]         = useState(null)
  const [userLng,         setUserLng]         = useState(null)

  // Kumpulkan merchant ID yang ada dalam sesi aktif
  const merchantsInSession = new Set(
    activeSessions.flatMap(s => (s.food_orders || []).map(o => o.merchant_id))
  )

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude) },
        () => {}
      )
    }
  }, [])

  // Fetch merchants
  useEffect(() => {
    setLoading(true)
    const controller = new AbortController()
    const params = {}
    if (category) params.category = category
    if (search)   params.search   = search
    if (userLat)  params.lat = userLat
    if (userLng)  params.lng = userLng

    api.get('/food/merchants', { params, signal: controller.signal })
      .then(r => setMerchants(r.data.data))
      .catch(err => { if (err.name !== 'CanceledError' && err.name !== 'AbortError') {} })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [category, search, userLat, userLng])

  // Fetch sesi hemat ongkir aktif
  useEffect(() => {
    const params = {}
    if (userLat) params.lat = userLat
    if (userLng) params.lng = userLng
    api.get('/food/jastip/sessions/available', { params })
      .then(r => setActiveSessions(r.data.data || []))
      .catch(() => {})
  }, [userLat, userLng])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        background: 'var(--k-surface)',
        borderBottom: '1px solid var(--k-border)', position: 'sticky', top: 0, zIndex: 10,
      }}>
        {/* Hero banner */}
        <div style={{
          background: 'linear-gradient(135deg, #FFF4EE 0%, #FFFBF5 100%)',
          padding: '20px 20px 16px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position:'absolute', right:-10, top:-8, fontSize:90, opacity:0.09, transform:'rotate(10deg)', pointerEvents:'none' }}>🍱</div>
          <div style={{ position:'absolute', right:64, bottom:-14, fontSize:60, opacity:0.07, transform:'rotate(-8deg)', pointerEvents:'none' }}>🍜</div>
          <div style={{ position:'absolute', left:-14, bottom:-14, width:72, height:72, borderRadius:'50%', background:'rgba(249,115,22,0.08)', pointerEvents:'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, position:'relative', zIndex:1 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: 'rgba(249,115,22,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
            }}>🍜</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--k-text)' }}>ZasaFood</div>
              <div style={{ fontSize: 12, color: 'var(--k-sub)' }}>Pesan dari warung lokal favoritmu</div>
            </div>
          </div>

          <input
            type="text" placeholder="🔍  Cari nama warung..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '11px 16px', borderRadius: 14, fontSize: 14, boxSizing: 'border-box',
              border: '1.5px solid var(--k-border)', background: 'var(--k-surface)', color: 'var(--k-text)',
              outline: 'none', position: 'relative', zIndex: 1,
            }}
          />
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 16px 12px' }}>
          {CAT_TABS.map(t => (
            <button key={t.key} onClick={() => setCategory(t.key)} style={{
              padding: '7px 18px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontWeight: category === t.key ? 700 : 500, fontSize: 13, whiteSpace: 'nowrap',
              background: category === t.key ? 'var(--k-primary)' : 'var(--k-input)',
              color: category === t.key ? '#fff' : 'var(--k-sub)',
              transition: 'all 0.18s',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* Banner Sesi Hemat Ongkir */}
        {activeSessions.length > 0 && (
          <div
            onClick={() => navigate('/food/jastip/sessions')}
            style={{
              marginBottom: 16, padding: '14px 16px', borderRadius: 16, cursor: 'pointer',
              background: 'linear-gradient(135deg, #F97316 0%, #FF4500 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 26 }}>🛵</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>
                  Sesi Hemat Ongkir Tersedia!
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                  {activeSessions.length} mitra siap, bayar 1 ongkir untuk multi warung
                </div>
              </div>
            </div>
            <span style={{ color: '#fff', fontSize: 20 }}>›</span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-sub)' }}>Memuat merchant...</div>
        ) : merchants.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-sub)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
            <div>Tidak ada merchant ditemukan.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {merchants.map(m => (
              <div key={m.id} onClick={() => navigate(`/food/merchants/${m.id}`)} style={{
                borderRadius: 18, overflow: 'hidden',
                background: merchantsInSession.has(m.id)
                  ? 'linear-gradient(145deg, #FFF4EE 0%, #fff 60%)'
                  : m.is_open
                    ? 'var(--k-card)'
                    : 'var(--k-card)',
                border: merchantsInSession.has(m.id)
                  ? '2px solid #F97316'
                  : '1px solid var(--k-border)',
                cursor: 'pointer',
                boxShadow: m.is_open ? 'var(--k-shadow)' : 'none',
              }}>
                {/* Banner */}
                <div style={{
                  height: 120, background: 'var(--k-input)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', position: 'relative',
                }}>
                  {m.banner_path
                    ? <img src={storageUrl(m.banner_path)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 48 }}>🍜</span>
                  }
                  <span style={{
                    position: 'absolute', top: 10, right: 10,
                    padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: m.is_open ? 'rgba(0,200,150,0.9)' : 'rgba(0,0,0,0.5)',
                    color: '#fff',
                  }}>{m.is_open ? 'Buka' : 'Tutup'}</span>

                  {/* Badge hemat ongkir */}
                  {merchantsInSession.has(m.id) && (
                    <span style={{
                      position: 'absolute', top: 10, left: 10,
                      padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: '#F97316', color: '#fff',
                    }}>🛵 Ada di sesi</span>
                  )}
                </div>

                <div style={{ padding: '14px', display: 'flex', gap: 12 }}>
                  {/* Logo */}
                  <div style={{
                    width: 48, height: 48, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
                    background: 'var(--k-input)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, marginTop: -28, border: '3px solid var(--k-card)',
                  }}>
                    {m.logo_path
                      ? <img src={storageUrl(m.logo_path)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : '🏪'
                    }
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{m.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--k-sub)' }}>
                        ⭐ {fmtRating(m.average_rating)}
                        {m.total_ratings > 0 && ` (${m.total_ratings})`}
                      </span>
                      {m.distance_km !== undefined && (
                        <span style={{ fontSize: 12, color: 'var(--k-sub)' }}>📍 {m.distance_km} km</span>
                      )}
                      <span style={{ fontSize: 12, color: 'var(--k-sub)' }}>🍽️ {m.menu_items_count} menu</span>
                    </div>
                    {merchantsInSession.has(m.id) && (
                      <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700, color: '#F97316' }}>
                        ✓ Hemat ongkir tersedia — gabung sesi mitra
                      </div>
                    )}
                    {m.description && !merchantsInSession.has(m.id) && (
                      <div style={{
                        fontSize: 12, color: 'var(--k-sub)', marginTop: 4,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{m.description}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
