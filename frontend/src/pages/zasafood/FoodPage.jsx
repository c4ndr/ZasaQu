import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../components/BottomNav'
import api from '../../services/api'

function fmtRating(r) { return r > 0 ? r.toFixed(1) : '—' }

const CAT_TABS = [
  { key: '',             label: 'Semua'          },
  { key: 'makanan_berat',label: 'Makanan'        },
  { key: 'minuman',      label: 'Minuman'        },
  { key: 'snack',        label: 'Snack'          },
]

export default function FoodPage() {
  const navigate = useNavigate()
  const [merchants, setMerchants] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [category,  setCategory]  = useState('')
  const [search,    setSearch]    = useState('')

  useEffect(() => {
    setLoading(true)
    const controller = new AbortController()
    const params = {}
    if (category) params.category = category
    if (search)   params.search   = search

    // Coba dapatkan koordinat user untuk sorting jarak
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          params.lat = pos.coords.latitude
          params.lng = pos.coords.longitude
          fetch_()
        },
        () => fetch_()
      )
    } else {
      fetch_()
    }

    function fetch_() {
      api.get('/food/merchants', { params, signal: controller.signal })
        .then(r => setMerchants(r.data.data))
        .catch(err => { if (err.name !== 'CanceledError' && err.name !== 'AbortError') {} })
        .finally(() => setLoading(false))
    }

    return () => controller.abort()
  }, [category, search])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        padding: '20px 20px 0', background: 'var(--k-card)',
        borderBottom: '1px solid var(--k-border)', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 28 }}>🍜</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>ZasaFood</div>
            <div style={{ fontSize: 12, color: 'var(--k-sub)' }}>Pesan makanan dari warung lokal</div>
          </div>
        </div>

        {/* Search */}
        <input
          type="text" placeholder="Cari nama warung..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '10px 16px', borderRadius: 20, fontSize: 14, boxSizing: 'border-box',
            border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)',
            marginBottom: 14,
          }}
        />

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 14 }}>
          {CAT_TABS.map(t => (
            <button key={t.key} onClick={() => setCategory(t.key)} style={{
              padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontWeight: category === t.key ? 700 : 400, fontSize: 13, whiteSpace: 'nowrap',
              background: category === t.key ? '#FF7A45' : 'var(--k-input)',
              color: category === t.key ? '#fff' : 'var(--k-sub)',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '16px 16px 0' }}>
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
                borderRadius: 16, overflow: 'hidden', background: 'var(--k-card)',
                border: '1.5px solid var(--k-border)', cursor: 'pointer',
              }}>
                {/* Banner */}
                <div style={{
                  height: 120, background: 'var(--k-input)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', position: 'relative',
                }}>
                  {m.banner_path
                    ? <img src={`/storage/${m.banner_path}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 48 }}>🍜</span>
                  }
                  {/* Status badge */}
                  <span style={{
                    position: 'absolute', top: 10, right: 10,
                    padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: m.is_open ? 'rgba(0,200,150,0.9)' : 'rgba(0,0,0,0.5)',
                    color: '#fff',
                  }}>{m.is_open ? 'Buka' : 'Tutup'}</span>
                </div>

                <div style={{ padding: '14px', display: 'flex', gap: 12 }}>
                  {/* Logo */}
                  <div style={{
                    width: 48, height: 48, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
                    background: 'var(--k-input)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, marginTop: -28, border: '3px solid var(--k-card)',
                  }}>
                    {m.logo_path
                      ? <img src={`/storage/${m.logo_path}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                    {m.description && (
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
