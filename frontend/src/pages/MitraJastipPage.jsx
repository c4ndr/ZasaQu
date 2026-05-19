import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import api from '../services/api'

const fmtRp = (v) => 'Rp ' + Number(v ?? 0).toLocaleString('id-ID')

export default function MitraJastipPage() {
  const [session,     setSession]    = useState(null)
  const [loading,     setLoading]    = useState(true)
  const [closing,     setClosing]    = useState(false)
  const [starting,    setStarting]   = useState(false)
  const [error,       setError]      = useState('')
  const [gpsActive,   setGpsActive]  = useState(false)
  const [gpsLocation, setGpsLocation] = useState(null) // {lat, lng}
  const [activeOrder, setActiveOrder] = useState(null)
  const [radius,      setRadius]     = useState(2000) // meter

  async function refreshStatus() {
    try {
      const [sessionRes, gpsRes, ordersRes] = await Promise.all([
        api.get('/jastip/sessions/current').catch(() => ({ data: null })),
        api.get('/mitra/gps/status').catch(() => ({ data: { active: false } })),
        api.get('/mitra/orders/my').catch(() => ({ data: [] })),
      ])
      setSession(sessionRes.data ?? null)
      const gps = gpsRes.data
      setGpsActive(gps?.active === true)
      if (gps?.active && gps?.location) setGpsLocation(gps.location)
      const rawOrders = ordersRes.data?.data ?? ordersRes.data ?? []
      const list = Array.isArray(rawOrders) ? rawOrders : []
      setActiveOrder(list.find(o => !['completed', 'cancelled'].includes(o.status)) ?? null)
    } catch { /* silent */ }
  }

  useEffect(() => {
    refreshStatus().finally(() => setLoading(false))
    const t = setInterval(refreshStatus, 20000)
    return () => clearInterval(t)
  }, []) // eslint-disable-line

  // Mulai sesi — ambil GPS sekarang lalu buka sesi
  async function handleStart() {
    setError('')
    setStarting(true)
    try {
      // Ambil koordinat GPS saat ini
      const coords = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) { reject(new Error('GPS tidak tersedia')); return }
        navigator.geolocation.getCurrentPosition(
          pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          err => reject(err),
          // enableHighAccuracy: false → pakai jaringan/WiFi, jauh lebih cepat (1-2 detik)
          // Untuk jastip, akurasi 100-500m sudah cukup
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
        )
      })

      const res = await api.post('/jastip/sessions', {
        origin_lat:      coords.lat,
        origin_lng:      coords.lng,
        corridor_width:  radius,
      })
      setSession(res.data?.data ?? res.data)
      setGpsLocation(coords)
    } catch (e) {
      if (e?.code === 1) setError('Izin GPS ditolak. Buka pengaturan browser dan izinkan akses lokasi.')
      else if (e?.code === 2) setError('GPS tidak bisa mendapat sinyal. Coba di tempat terbuka.')
      else if (e?.code === 3) setError('GPS timeout. Pastikan GPS HP aktif lalu coba lagi.')
      else setError(e?.response?.data?.message ?? e?.message ?? 'Gagal membuka sesi.')
    } finally {
      setStarting(false)
    }
  }

  async function handleStop() {
    if (!window.confirm('Tutup sesi JastipQu? Anda tidak akan menerima titipan baru.')) return
    setClosing(true); setError('')
    try {
      await api.delete('/jastip/sessions/current')
      setSession(null)
    } catch (e) {
      if (e?.response?.status === 404) { setSession(null); return }
      setError(e?.response?.data?.message ?? 'Gagal menutup sesi.')
    } finally { setClosing(false) }
  }

  const isActive = !!session
  const orders   = session?.jastip_orders ?? []

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 100 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>

      {/* Header */}
      <div style={{ padding: '52px 20px 16px', background: 'linear-gradient(180deg, #0F1020 0%, var(--k-bg) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--k-text)', marginBottom: 2 }}>⚡ JastipQu</h1>
            <p style={{ fontSize: 13, color: 'var(--k-muted)' }}>
              {isActive ? 'Sesi aktif — menerima titipan' : 'Siap menerima titipan dari pelanggan'}
            </p>
          </div>
          <div style={{
            padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 700,
            background: isActive ? 'rgba(0,200,150,0.12)' : 'var(--k-card)',
            color: isActive ? 'var(--k-accent)' : 'var(--k-muted)',
            border: `1px solid ${isActive ? 'rgba(0,200,150,0.3)' : 'var(--k-border)'}`,
            animation: isActive ? 'pulse 2s infinite' : 'none',
          }}>
            {isActive ? '● AKTIF' : '○ OFF'}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{ width: 32, height: 32, border: '3px solid var(--k-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : (
          <>
            {/* ── Banner GPS ── */}
            <div style={{
              padding: '12px 14px', borderRadius: 14,
              background: gpsActive ? 'rgba(0,200,150,0.08)' : 'rgba(246,173,85,0.08)',
              border: `1px solid ${gpsActive ? 'rgba(0,200,150,0.25)' : 'rgba(246,173,85,0.3)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>{gpsActive ? '📡' : '📵'}</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: gpsActive ? 'var(--k-accent)' : 'var(--k-warn)' }}>
                    GPS {gpsActive ? 'Aktif' : 'Tidak Aktif'}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>
                    {gpsActive
                      ? (gpsLocation ? `${gpsLocation.lat?.toFixed(4)}, ${gpsLocation.lng?.toFixed(4)}` : 'Mengirim lokasi...')
                      : 'Aktifkan GPS agar sesi terlihat pelanggan'}
                  </p>
                </div>
              </div>
              <Link to="/mitra/gps" style={{
                padding: '7px 12px', borderRadius: 10, textDecoration: 'none',
                background: gpsActive ? 'rgba(0,200,150,0.1)' : 'rgba(246,173,85,0.15)',
                color: gpsActive ? 'var(--k-accent)' : 'var(--k-warn)',
                fontSize: 12, fontWeight: 700,
              }}>
                {gpsActive ? 'GPS →' : 'Aktifkan →'}
              </Link>
            </div>

            {/* ── Banner Order Aktif ── */}
            {activeOrder && !isActive && (
              <div style={{
                padding: '14px', borderRadius: 16,
                background: 'rgba(99,179,237,0.08)', border: '1px solid rgba(99,179,237,0.25)',
              }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#63B3ED', marginBottom: 4 }}>
                  📦 Order #{activeOrder.order_number} sedang berjalan
                </p>
                <p style={{ fontSize: 12, color: 'var(--k-muted)', lineHeight: 1.5, marginBottom: 8 }}>
                  Tidak bisa buka JastipQu mandiri saat ada order aktif. Gunakan halaman GPS untuk buka JastipQu yang tertaut dengan order ini.
                </p>
                <Link to="/mitra/gps" style={{
                  display: 'inline-block', padding: '7px 14px', borderRadius: 10,
                  background: 'rgba(99,179,237,0.12)', color: '#63B3ED',
                  textDecoration: 'none', fontSize: 12, fontWeight: 700,
                }}>
                  Buka dari Halaman GPS →
                </Link>
              </div>
            )}

            {/* ── TOMBOL UTAMA ── */}
            {!activeOrder && (
              <div style={{
                background: isActive ? 'rgba(0,200,150,0.06)' : 'var(--k-card)',
                border: `2px solid ${isActive ? 'rgba(0,200,150,0.4)' : 'rgba(79,70,229,0.3)'}`,
                borderRadius: 24, padding: '24px 20px', textAlign: 'center',
              }}>
                {isActive ? (
                  /* ── SESI SEDANG AKTIF ── */
                  <>
                    <div style={{ fontSize: 48, marginBottom: 8 }}>⚡</div>
                    <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--k-accent)', marginBottom: 4 }}>
                      Sesi JastipQu Aktif
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--k-muted)', marginBottom: 16 }}>
                      {session.jastip_count ?? 0}/{session.max_jastip ?? 3} titipan · {fmtRp(session.total_jastip_fee ?? 0)} terkumpul
                    </p>
                    {!gpsActive && (
                      <div style={{ padding: '10px', borderRadius: 12, background: 'rgba(245,101,101,0.08)', border: '1px solid rgba(245,101,101,0.25)', marginBottom: 14 }}>
                        <p style={{ fontSize: 12, color: 'var(--k-danger)' }}>
                          ⚠️ GPS mati — sesi tidak terlihat pelanggan!{' '}
                          <Link to="/mitra/gps" style={{ color: 'var(--k-danger)', fontWeight: 700 }}>Aktifkan →</Link>
                        </p>
                      </div>
                    )}
                    <button
                      onClick={handleStop}
                      disabled={closing}
                      style={{
                        width: '100%', padding: '16px', borderRadius: 16,
                        background: 'rgba(245,101,101,0.08)', border: '2px solid rgba(245,101,101,0.3)',
                        color: 'var(--k-danger)', fontWeight: 800, fontSize: 16,
                        cursor: closing ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      }}
                    >
                      {closing
                        ? <><span style={{ width: 18, height: 18, border: '2.5px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Menutup...</>
                        : '🔴 Tutup Sesi JastipQu'}
                    </button>
                  </>
                ) : (
                  /* ── BELUM ADA SESI ── */
                  <>
                    <div style={{ fontSize: 52, marginBottom: 12 }}>💤</div>
                    <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--k-text)', marginBottom: 6 }}>
                      Belum Ada Sesi
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--k-muted)', marginBottom: 20, lineHeight: 1.6 }}>
                      Ketuk tombol di bawah untuk mulai menerima titipan.{'\n'}
                      Lokasi GPS Anda akan digunakan secara otomatis.
                    </p>

                    {/* Slider radius */}
                    <div style={{ marginBottom: 20, textAlign: 'left' }}>
                      <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 6 }}>
                        Radius layanan: <strong style={{ color: 'var(--k-accent)' }}>
                          {radius >= 1000 ? `${radius/1000} km` : `${radius} m`}
                        </strong> dari lokasi Anda
                      </p>
                      <input
                        type="range" min={500} max={5000} step={500} value={radius}
                        onChange={e => setRadius(Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--k-accent)' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--k-muted)', marginTop: 2 }}>
                        <span>500m</span><span>2.5km</span><span>5km</span>
                      </div>
                    </div>

                    <button
                      onClick={handleStart}
                      disabled={starting}
                      style={{
                        width: '100%', padding: '18px', borderRadius: 18, border: 'none',
                        background: starting ? 'var(--k-border)' : 'rgba(79,70,229,0.85)',
                        color: starting ? 'var(--k-muted)' : '#fff',
                        fontWeight: 800, fontSize: 17,
                        cursor: starting ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                        boxShadow: starting ? 'none' : '0 4px 20px rgba(79,70,229,0.4)',
                      }}
                    >
                      {starting
                        ? <><span style={{ width: 20, height: 20, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Mengambil lokasi...</>
                        : '⚡ Mulai JastipQu'}
                    </button>

                    {error && (
                      <p style={{ color: 'var(--k-danger)', fontSize: 13, marginTop: 12, lineHeight: 1.5 }}>
                        ⚠️ {error}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Daftar Titipan ── */}
            {isActive && (
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-sub)', marginBottom: 10 }}>
                  📦 Titipan Masuk ({orders.length})
                </p>
                {orders.length === 0 ? (
                  <div style={{
                    background: 'var(--k-card)', border: '1px solid var(--k-border)',
                    borderRadius: 16, padding: '28px 20px', textAlign: 'center',
                  }}>
                    <p style={{ fontSize: 28, marginBottom: 8 }}>📭</p>
                    <p style={{ color: 'var(--k-muted)', fontSize: 14, fontWeight: 600 }}>Belum ada titipan</p>
                    <p style={{ color: 'var(--k-muted)', fontSize: 12, marginTop: 4 }}>
                      {gpsActive
                        ? 'Pelanggan di sekitar Anda bisa melihat dan menitipkan barang'
                        : 'Aktifkan GPS agar sesi terlihat oleh pelanggan'}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {orders.map(o => (
                      <div key={o.id} style={{
                        background: 'var(--k-card)', border: '1px solid var(--k-border)',
                        borderRadius: 16, padding: '14px 16px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                              background: 'rgba(99,179,237,0.12)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 16, fontWeight: 700, color: '#63B3ED',
                            }}>
                              {(o.customer?.name ?? 'P')[0].toUpperCase()}
                            </div>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>
                                {o.customer?.name ?? 'Pelanggan'}
                              </p>
                              <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{o.item_description}</p>
                            </div>
                          </div>
                          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--k-accent)' }}>
                            {fmtRp(o.shipping_fee)}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 100, background: 'var(--k-card2)', color: 'var(--k-muted)' }}>
                            📍 {o.pickup_address?.split(',')[0]}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--k-muted)' }}>→</span>
                          <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 100, background: 'var(--k-card2)', color: 'var(--k-muted)' }}>
                            🏁 {o.dropoff_address?.split(',')[0]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Info */}
            {!isActive && !activeOrder && (
              <div style={{
                background: 'rgba(79,70,229,0.06)', border: '1px solid rgba(79,70,229,0.15)',
                borderRadius: 16, padding: '14px 16px',
              }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#818CF8', marginBottom: 8 }}>⚡ Cara Kerja</p>
                <div style={{ fontSize: 12, color: 'var(--k-muted)', lineHeight: 2 }}>
                  <p>1️⃣ Aktifkan GPS di halaman GPS Saya</p>
                  <p>2️⃣ Atur radius layanan di atas</p>
                  <p>3️⃣ Ketuk <strong style={{ color: '#818CF8' }}>Mulai JastipQu</strong></p>
                  <p>4️⃣ Pelanggan dalam radius Anda bisa menitip barang</p>
                  <p>5️⃣ Tutup sesi kapan saja jika sudah selesai</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
