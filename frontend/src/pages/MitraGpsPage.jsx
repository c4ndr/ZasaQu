import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import useGps from '../hooks/useGps'
import LocationSearch from '../components/LocationSearch'
import api from '../services/api'

// ── Fix ikon Leaflet ──────────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ── Ikon posisi mitra (dot pulse) ─────────────────────────────────────────────
const myIcon = L.divIcon({
  html: `
    <div style="position:relative;width:52px;height:52px;display:flex;align-items:center;justify-content:center">
      <div style="
        position:absolute;width:52px;height:52px;border-radius:50%;
        background:rgba(0,200,150,0.15);
        animation:gps-ring 2s ease-out infinite;
      "></div>
      <div style="
        position:absolute;width:36px;height:36px;border-radius:50%;
        background:rgba(0,200,150,0.25);
        animation:gps-ring 2s ease-out infinite 0.4s;
      "></div>
      <div style="
        width:20px;height:20px;border-radius:50%;
        background:#00C896;border:3px solid #fff;
        box-shadow:0 2px 12px rgba(0,200,150,0.6);
        position:relative;z-index:1;
      "></div>
    </div>`,
  iconSize:   [52, 52],
  iconAnchor: [26, 26],
  className:  '',
})

// ── Follow lokasi di peta ─────────────────────────────────────────────────────
function MapFollower({ position, follow }) {
  const map    = useMap()
  const isFirst = useRef(true)
  useEffect(() => {
    if (!position) return
    if (isFirst.current || follow) {
      map.flyTo(position, map.getZoom() < 14 ? 16 : map.getZoom(), { duration: 0.8 })
      isFirst.current = false
    }
  }, [position, follow, map])
  return null
}

// ── Format koordinat ──────────────────────────────────────────────────────────
function fmtCoord(v) { return v?.toFixed(6) ?? '—' }

// window.isSecureContext adalah API bawaan browser — menghormati Chrome flags
// Baca saat runtime (bukan konstanta) agar selalu up-to-date
function getSecureCtx() { return typeof window !== 'undefined' && window.isSecureContext }

// Terjemahkan pesan error browser ke Bahasa Indonesia
function translateGpsError(msg = '', onMobile = false) {
  const m = msg.toLowerCase()
  if (m.includes('secure') || m.includes('origin') || m.includes('https'))
    return 'GPS diblokir karena koneksi HTTP. Akses lewat link Cloudflare (https://...) agar GPS berfungsi.'
  if (m.includes('denied') || m.includes('permission') || m.includes('authorization'))
    return 'Izin lokasi ditolak. Buka Pengaturan HP → Aplikasi → Browser → Izin → Lokasi → Izinkan, lalu coba lagi.'
  if (m.includes('unavailable') || m.includes('network') || m.includes('failed'))
    return onMobile
      ? 'GPS tidak bisa didapat. Pastikan GPS HP aktif di Pengaturan, lalu coba lagi di tempat terbuka.'
      : 'GPS tidak tersedia. Fitur ini hanya berfungsi di HP — buka link di browser HP Anda.'
  if (m.includes('timeout'))
    return 'Sinyal GPS lemah atau terlambat. Pindah ke tempat terbuka, pastikan GPS HP aktif, lalu coba lagi.'
  return msg || 'Gagal mendapatkan lokasi GPS.'
}

// ── Format rupiah ─────────────────────────────────────────────────────────────
function fmtRp(v) { return 'Rp ' + Number(v ?? 0).toLocaleString('id-ID') }

// ── Nominatim geocoding — tidak butuh GPS/HTTPS ─────────────────────────────
async function geocodeAddress(query) {
  if (!query.trim()) return null
  const res  = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=id`)
  const data = await res.json()
  if (!data.length) return null
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name }
}

// Deteksi apakah perangkat adalah desktop (bukan HP/tablet)
function isDesktopDevice() {
  if (typeof navigator === 'undefined') return false
  return !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// ── Halaman utama ─────────────────────────────────────────────────────────────
export default function MitraGpsPage() {
  const [gpsEnabled,  setGpsEnabled]  = useState(false)
  const [follow,      setFollow]      = useState(true)
  const [panelOpen,   setPanelOpen]   = useState(true)
  const [lastUpdate,  setLastUpdate]  = useState(null)
  const [accuracy,    setAccuracy]    = useState(null)
  const [localError,  setLocalError]  = useState('')  // error sebelum GPS diaktifkan
  const isDesktop = isDesktopDevice()

  // ── State JastipQu ───────────────────────────────────────────────────────────
  const [jastipSession,   setJastipSession]   = useState(null)
  const [loadingSession,  setLoadingSession]  = useState(true)
  const [showOpenForm,    setShowOpenForm]    = useState(false)

  // State form buka sesi
  const [formOriginAddr,    setFormOriginAddr]    = useState('')
  const [formOriginLat,     setFormOriginLat]     = useState('')
  const [formOriginLng,     setFormOriginLng]     = useState('')
  const [formDestAddr,      setFormDestAddr]      = useState('')
  const [formDestLat,       setFormDestLat]       = useState('')
  const [formDestLng,       setFormDestLng]       = useState('')
  const [formCorridorWidth, setFormCorridorWidth] = useState(500)
  const [openingSession,    setOpeningSession]    = useState(false)
  const [openSessionError,  setOpenSessionError]  = useState('')
  const [closingSession,    setClosingSession]    = useState(false)
  const [closeSessionError, setCloseSessionError] = useState('')
  const [geoOriginLoading,  setGeoOriginLoading]  = useState(false)
  const [geoDestLoading,    setGeoDestLoading]    = useState(false)

  // ── Fetch sesi JastipQu saat mount + auto-refresh tiap 30 detik ─────────────
  useEffect(() => {
    fetchJastipSession()
    const interval = setInterval(fetchJastipSession, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchJastipSession() {
    setLoadingSession(true)
    try {
      const res = await api.get('/jastip/sessions/current')
      setJastipSession(res.data?.data ?? res.data ?? null)
    } catch (e) {
      // 404 = tidak ada sesi aktif, bukan error fatal
      if (e?.response?.status === 404) {
        setJastipSession(null)
      }
    } finally {
      setLoadingSession(false)
    }
  }

  const { location, error, active } = useGps({
    enabled:  gpsEnabled,
    onLost:   () => setGpsEnabled(false),
    onUpdate: (pos) => {
      setLastUpdate(new Date())
      setAccuracy(pos?.coords?.accuracy ?? null)
    },
  })

  // Saat error dari hook, matikan GPS otomatis agar tombol kembali ke "Aktifkan"
  useEffect(() => {
    if (error) setGpsEnabled(false)
  }, [error])

  // ── Auto-fill origin dari GPS jika tersedia saat form dibuka ─────────────────
  useEffect(() => {
    if (showOpenForm && location && !formOriginLat) {
      setFormOriginLat(location.lat.toFixed(6))
      setFormOriginLng(location.lng.toFixed(6))
      setFormOriginAddr(`${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`)
    }
  }, [showOpenForm, location])

  // ── Geocode origin via Nominatim ─────────────────────────────────────────────
  async function handleGeoOrigin() {
    if (!formOriginAddr.trim()) return
    setGeoOriginLoading(true); setOpenSessionError('')
    try {
      const r = await geocodeAddress(formOriginAddr)
      if (!r) { setOpenSessionError('Lokasi asal tidak ditemukan, coba perjelas.'); return }
      setFormOriginLat(r.lat.toFixed(6)); setFormOriginLng(r.lng.toFixed(6))
      setFormOriginAddr(r.display)
    } catch { setOpenSessionError('Gagal mencari lokasi asal.') }
    finally { setGeoOriginLoading(false) }
  }

  // ── Geocode tujuan via Nominatim ─────────────────────────────────────────────
  async function handleGeoDest() {
    if (!formDestAddr.trim()) return
    setGeoDestLoading(true); setOpenSessionError('')
    try {
      const r = await geocodeAddress(formDestAddr)
      if (!r) { setOpenSessionError('Lokasi tujuan tidak ditemukan, coba perjelas.'); return }
      setFormDestLat(r.lat.toFixed(6)); setFormDestLng(r.lng.toFixed(6))
      setFormDestAddr(r.display)
    } catch { setOpenSessionError('Gagal mencari lokasi tujuan.') }
    finally { setGeoDestLoading(false) }
  }

  // ── Buka sesi JastipQu ───────────────────────────────────────────────────────
  async function handleOpenSession() {
    if (!formOriginAddr.trim()) { setOpenSessionError('Lokasi asal wajib diisi.'); return }
    if (!formOriginLat || !formOriginLng) { setOpenSessionError('Klik "Cari" untuk validasi lokasi asal.'); return }
    if (!formDestAddr.trim())   { setOpenSessionError('Lokasi tujuan wajib diisi.'); return }
    if (!formDestLat || !formDestLng) { setOpenSessionError('Klik "Cari" untuk validasi lokasi tujuan.'); return }
    setOpeningSession(true)
    setOpenSessionError('')
    try {
      const payload = {
        origin_lat:       parseFloat(formOriginLat),
        origin_lng:       parseFloat(formOriginLng),
        destination_lat:  parseFloat(formDestLat),
        destination_lng:  parseFloat(formDestLng),
        corridor_width:   formCorridorWidth,
      }
      const res = await api.post('/jastip/sessions', payload)
      setJastipSession(res.data?.data ?? res.data ?? null)
      setShowOpenForm(false)
      setOpenSessionError('')
    } catch (e) {
      setOpenSessionError(e?.response?.data?.message ?? 'Gagal membuka sesi. Coba lagi.')
    } finally {
      setOpeningSession(false)
    }
  }

  // ── Tutup sesi JastipQu ──────────────────────────────────────────────────────
  async function handleCloseSession() {
    if (!window.confirm('Tutup sesi JastipQu? Mitra tidak akan menerima titipan baru.')) return
    setClosingSession(true)
    setCloseSessionError('')
    try {
      await api.delete('/jastip/sessions/current')
      setJastipSession(null)
      setShowOpenForm(false)
    } catch (e) {
      if (e?.response?.status === 404) {
        // Sesi sudah ditutup otomatis (GPS mati) — update UI agar sesuai
        setJastipSession(null)
        setShowOpenForm(false)
        return
      }
      setCloseSessionError(e?.response?.data?.message ?? 'Gagal menutup sesi. Coba lagi.')
    } finally {
      setClosingSession(false)
    }
  }

  const handleEnableGps = () => {
    setLocalError('')
    if (!navigator.geolocation) {
      setLocalError('Browser tidak mendukung GPS. Coba gunakan Chrome atau Firefox terbaru.')
      return
    }
    setGpsEnabled(true)
  }

  // Tick waktu terakhir update
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setTick(x => x + 1), 5000)
    return () => clearInterval(t)
  }, [active])

  const defaultCenter = location ? [location.lat, location.lng] : [-6.2088, 106.8456]
  const mapPosition   = location ? [location.lat, location.lng] : null

  function sinceUpdate() {
    if (!lastUpdate) return null
    const secs = Math.floor((Date.now() - lastUpdate) / 1000)
    if (secs < 60) return `${secs}dtk lalu`
    return `${Math.floor(secs / 60)}m lalu`
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <style>{`
        @keyframes gps-ring {
          0%   { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        .leaflet-container { background: #1A1A28 !important; }
        .leaflet-tile-pane { filter: brightness(0.92) saturate(0.85); }
        .leaflet-control-zoom a { background: #1E1E2E !important; color: #E8E8F2 !important; border-color: #252538 !important; }
        .leaflet-bar { border: 1px solid #252538 !important; box-shadow: 0 4px 12px rgba(0,0,0,0.35) !important; }
      `}</style>

      {/* ── Navbar floating ── */}
      <nav style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to="/dashboard" style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(25,25,39,0.92)', border: '1px solid rgba(37,37,56,0.8)',
            backdropFilter: 'blur(12px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--k-sub)', textDecoration: 'none', fontSize: 18,
          }}>←</Link>
          <div style={{
            padding: '8px 14px', borderRadius: 12,
            background: 'rgba(25,25,39,0.92)', border: '1px solid rgba(37,37,56,0.8)',
            backdropFilter: 'blur(12px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--k-text)', lineHeight: 1.2 }}>GPS Saya</p>
            <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>Posisi mitra real-time</p>
          </div>
        </div>

        {/* Follow toggle */}
        <button onClick={() => setFollow(f => !f)} style={{
          width: 40, height: 40, borderRadius: 12,
          background: follow ? 'rgba(0,200,150,0.2)' : 'rgba(25,25,39,0.92)',
          border: `1px solid ${follow ? 'rgba(0,200,150,0.4)' : 'rgba(37,37,56,0.8)'}`,
          backdropFilter: 'blur(12px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 18, color: follow ? 'var(--k-accent)' : 'var(--k-muted)',
        }} title={follow ? 'Berhenti ikuti lokasi' : 'Ikuti lokasiku'}>
          🎯
        </button>
      </nav>

      {/* ── Badge status GPS (tengah atas) ── */}
      <div style={{
        position: 'absolute', top: 72, left: '50%', transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 16px', borderRadius: 100,
        background: 'rgba(25,25,39,0.92)',
        border: `1px solid ${active ? 'rgba(0,200,150,0.35)' : 'rgba(37,37,56,0.8)'}`,
        backdropFilter: 'blur(12px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        whiteSpace: 'nowrap',
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: active ? 'var(--k-accent)' : gpsEnabled ? 'var(--k-warn)' : 'var(--k-muted)',
          animation: active ? 'blink 2s infinite' : 'none',
        }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: active ? 'var(--k-accent)' : gpsEnabled ? 'var(--k-warn)' : 'var(--k-muted)' }}>
          {active ? 'GPS Aktif — Mengirim Lokasi' : gpsEnabled ? 'Mendapatkan Sinyal...' : 'GPS Nonaktif'}
        </span>
      </div>

      {/* ── Peta ── */}
      <div style={{ flex: 1, minHeight: panelOpen ? 'calc(100vh - 280px)' : 'calc(100vh - 72px)', transition: 'min-height 0.3s' }}>
        <MapContainer
          center={defaultCenter}
          zoom={16}
          style={{ height: '100%', width: '100%', minHeight: 300 }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {mapPosition && (
            <>
              <MapFollower position={mapPosition} follow={follow} />

              {/* Lingkaran akurasi GPS */}
              {accuracy && (
                <Circle
                  center={mapPosition}
                  radius={accuracy}
                  pathOptions={{ color: '#00C896', fillColor: '#00C896', fillOpacity: 0.06, weight: 1, opacity: 0.4 }}
                />
              )}

              {/* Marker posisi mitra */}
              <Marker position={mapPosition} icon={myIcon} />
            </>
          )}

          {/* Jika GPS belum aktif — tampilkan overlay petunjuk */}
          {!mapPosition && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(12,12,22,0.5)', pointerEvents: 'none',
            }}>
              <div style={{
                padding: '16px 24px', borderRadius: 16,
                background: 'rgba(25,25,39,0.95)', border: '1px solid rgba(37,37,56,0.8)',
                textAlign: 'center',
              }}>
                <p style={{ fontSize: 32, marginBottom: 8 }}>📍</p>
                <p style={{ color: 'var(--k-sub)', fontSize: 13, fontWeight: 600 }}>
                  Aktifkan GPS untuk memulai
                </p>
              </div>
            </div>
          )}
        </MapContainer>
      </div>

      {/* ── Tombol GPS floating — selalu terlihat meski panel tertutup ── */}
      {!panelOpen && (
        <div style={{
          position: 'absolute', bottom: 72, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1002, display: 'flex', gap: 10, alignItems: 'center',
        }}>
          <button
            onClick={active ? () => setGpsEnabled(false) : handleEnableGps}
            style={{
              padding: '12px 24px', borderRadius: 100, border: 'none',
              background: active ? 'rgba(245,101,101,0.9)' : 'var(--k-accent)',
              color: active ? '#fff' : '#0C0C16',
              fontWeight: 800, fontSize: 14, cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <span style={{ fontSize: 18 }}>{active ? '🔴' : '📍'}</span>
            {active ? 'Matikan GPS' : 'Aktifkan GPS'}
          </button>
        </div>
      )}

      {/* ── Tombol buka/tutup panel ── */}
      <button onClick={() => setPanelOpen(o => !o)} style={{
        position: 'absolute', bottom: panelOpen ? 320 : 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 1001, padding: '8px 20px', borderRadius: 100,
        background: 'rgba(25,25,39,0.95)', border: '1px solid rgba(37,37,56,0.8)',
        backdropFilter: 'blur(12px)', color: 'var(--k-sub)', fontSize: 12, fontWeight: 700,
        cursor: 'pointer', transition: 'bottom 0.3s', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {panelOpen ? '▼ Sembunyikan' : '▲ Panel'}
      </button>

      {/* ── Panel kontrol bawah ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        maxHeight: panelOpen ? 320 : 0, overflow: 'hidden',
        transition: 'max-height 0.3s ease',
        background: 'var(--k-surface)', borderTop: '1px solid var(--k-border)',
        zIndex: 1000,
      }}>
        {/* Tombol GPS selalu di atas agar tidak terpotong */}
        <div style={{ padding: '12px 16px 0' }}>
          {!gpsEnabled ? (
            <button onClick={handleEnableGps} style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none',
              background: 'var(--k-accent)', color: '#0C0C16', fontWeight: 800,
              fontSize: 15, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>📍</span>
              Aktifkan GPS
            </button>
          ) : (
            <button onClick={() => setGpsEnabled(false)} style={{
              width: '100%', padding: '14px', borderRadius: 14,
              background: 'rgba(245,101,101,0.08)',
              border: '1.5px solid rgba(245,101,101,0.3)',
              color: 'var(--k-danger)', fontWeight: 700, fontSize: 15,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>🔴</span>
              Matikan GPS
            </button>
          )}
        </div>
        <div style={{ padding: '12px 16px 20px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: 220 }}>

          {/* Kartu status lokasi */}
          <div style={{
            background: 'var(--k-card)', border: `1px solid ${active ? 'rgba(0,200,150,0.25)' : 'var(--k-border)'}`,
            borderRadius: 18, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 14,
            transition: 'border-color 0.3s',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: active ? 'rgba(0,200,150,0.1)' : 'var(--k-card2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24,
            }}>
              {active ? '📡' : gpsEnabled ? '⏳' : '📵'}
            </div>
            <div style={{ flex: 1 }}>
              {location ? (
                <>
                  <p style={{ color: 'var(--k-text)', fontWeight: 700, fontSize: 14, marginBottom: 3 }}>
                    {fmtCoord(location.lat)}, {fmtCoord(location.lng)}
                  </p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {accuracy && (
                      <span style={{ color: 'var(--k-muted)', fontSize: 11 }}>
                        Akurasi ±{Math.round(accuracy)}m
                      </span>
                    )}
                    {sinceUpdate() && (
                      <span style={{ color: 'var(--k-muted)', fontSize: 11 }}>
                        · Diperbarui {sinceUpdate()}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <p style={{ color: 'var(--k-muted)', fontSize: 14 }}>
                  {gpsEnabled ? 'Mendapatkan sinyal GPS...' : 'Belum ada lokasi'}
                </p>
              )}
              {(error || localError) && (
                <p style={{ color: 'var(--k-danger)', fontSize: 12, marginTop: 2 }}>
                  {translateGpsError(error || localError, !isDesktop)}
                </p>
              )}
            </div>
            {active && (
              <div style={{ flexShrink: 0 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', background: 'var(--k-accent)',
                  animation: 'blink 2s infinite',
                }} />
              </div>
            )}
          </div>

          {/* Warning perangkat desktop — tidak punya GPS hardware */}
          {isDesktop && !active && (
            <div style={{
              padding: '10px 14px', borderRadius: 12,
              background: 'rgba(246,173,85,0.08)', border: '1px solid rgba(246,173,85,0.25)',
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>💻</span>
              <p style={{ color: 'var(--k-warn)', fontSize: 12, lineHeight: 1.6 }}>
                GPS tidak tersedia di perangkat ini (komputer/laptop tidak punya hardware GPS).
                Buka halaman ini di <strong>HP</strong> menggunakan link Cloudflare tunnel agar GPS berfungsi.
              </p>
            </div>
          )}

          {/* Warning jika GPS gagal karena HTTP — tampil hanya setelah ada error */}
          {(error || localError) && !getSecureCtx() && (
            <div style={{
              padding: '10px 14px', borderRadius: 12,
              background: 'rgba(246,173,85,0.08)', border: '1px solid rgba(246,173,85,0.25)',
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
              <p style={{ color: 'var(--k-warn)', fontSize: 12, lineHeight: 1.6 }}>
                GPS diblokir browser karena koneksi HTTP. Akses lewat{' '}
                <strong>localhost:5174</strong> agar GPS berfungsi.
              </p>
            </div>
          )}

          {/* Info */}
          <div style={{
            background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.15)',
            borderRadius: 14, padding: '10px 14px',
            color: 'var(--k-accent)', fontSize: 12, lineHeight: 1.7,
          }}>
            ⚡ GPS wajib aktif saat sesi JastipQu. Lokasi dikirim otomatis setiap 5 detik.
            Jika sinyal hilang, sesi JastipQu tutup otomatis.
          </div>
        </div>
      </div>

      {/* ════════════════ Panel JastipQu ════════════════ */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        // Panel GPS sudah menempati bawah — JastipQu di bawahnya secara scroll
        // Karena layout adalah div statis di bawah peta, kita render setelah panel GPS
        zIndex: 999,
      }} />

      {/* Panel JastipQu — pakai bottom langsung (bukan transform) agar touch target tepat di iOS */}
      {panelOpen && (
        <div style={{
          position: 'absolute',
          bottom: 328,   // tepat di atas panel GPS (320px) + sedikit gap
          left: 0, right: 0,
          zIndex: 998,
          maxHeight: 'calc(100vh - 400px)',
          overflowY: 'auto',
          background: 'var(--k-bg)',
          borderTop: '1px solid rgba(79,70,229,0.2)',
          padding: '14px 16px 20px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {/* Header panel JastipQu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              padding: '4px 10px', borderRadius: 100,
              background: 'rgba(79,70,229,0.12)', border: '1px solid rgba(79,70,229,0.25)',
              fontSize: 11, fontWeight: 800, color: '#818CF8',
            }}>⚡ JastipQu</span>
            {loadingSession && (
              <span style={{ fontSize: 11, color: 'var(--k-muted)' }}>Memuat...</span>
            )}
          </div>

          {!loadingSession && (
            <>
              {/* ── Tidak ada sesi aktif ── */}
              {!jastipSession && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{
                    background: 'var(--k-card)', border: '1px solid var(--k-border)',
                    borderRadius: 16, padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <span style={{ fontSize: 28 }}>🚫</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', marginBottom: 2 }}>
                        Tidak Ada Sesi Aktif
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>
                        Buka sesi untuk menerima titipan dari pelanggan
                      </p>
                    </div>
                  </div>

                  {!showOpenForm ? (
                    <button
                      onClick={() => { setShowOpenForm(true); setOpenSessionError('') }}
                      style={{
                        width: '100%', padding: '13px', borderRadius: 14, border: 'none',
                        background: 'rgba(79,70,229,0.85)', color: '#fff',
                        fontWeight: 700, fontSize: 14, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}
                    >
                      ⚡ Buka Sesi JastipQu
                    </button>
                  ) : (
                    /* ── Form buka sesi ── */
                    <div style={{
                      background: 'var(--k-card)', border: '1px solid rgba(79,70,229,0.2)',
                      borderRadius: 18, padding: '16px',
                      display: 'flex', flexDirection: 'column', gap: 12,
                    }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>
                        Buka Sesi JastipQu
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: -8 }}>
                        Ketik alamat lalu tekan Cari — tidak butuh GPS
                      </p>

                      {/* Origin */}
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--k-muted)', display: 'block', marginBottom: 6 }}>
                          📍 Lokasi Asal
                        </label>
                        <LocationSearch
                          value={formOriginAddr}
                          confirmed={!!formOriginLat}
                          placeholder="Ketik nama jalan atau area..."
                          onChange={v => { setFormOriginAddr(v); setFormOriginLat(''); setFormOriginLng('') }}
                          onSelect={r => { setFormOriginAddr(r.display); setFormOriginLat(String(r.lat)); setFormOriginLng(String(r.lng)) }}
                        />
                        {formOriginLat && <p style={{ fontSize: 10, color: 'var(--k-accent)', marginTop: 4 }}>✓ {parseFloat(formOriginLat).toFixed(4)}, {parseFloat(formOriginLng).toFixed(4)}</p>}
                      </div>

                      {/* Destination */}
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--k-muted)', display: 'block', marginBottom: 6 }}>
                          🏁 Lokasi Tujuan
                        </label>
                        <LocationSearch
                          value={formDestAddr}
                          confirmed={!!formDestLat}
                          placeholder="Ketik nama jalan atau area..."
                          onChange={v => { setFormDestAddr(v); setFormDestLat(''); setFormDestLng('') }}
                          onSelect={r => { setFormDestAddr(r.display); setFormDestLat(String(r.lat)); setFormDestLng(String(r.lng)) }}
                        />
                        {formDestLat && <p style={{ fontSize: 10, color: 'var(--k-accent)', marginTop: 4 }}>✓ {parseFloat(formDestLat).toFixed(4)}, {parseFloat(formDestLng).toFixed(4)}</p>}
                      </div>

                      {/* Lebar koridor */}
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--k-muted)', display: 'block', marginBottom: 6 }}>
                          Lebar Koridor: <strong style={{ color: 'var(--k-accent)' }}>{formCorridorWidth} m</strong>
                        </label>
                        <input
                          type="range"
                          min={100} max={2000} step={100}
                          value={formCorridorWidth}
                          onChange={e => setFormCorridorWidth(Number(e.target.value))}
                          style={{ width: '100%', accentColor: 'var(--k-accent)', cursor: 'pointer' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--k-muted)', marginTop: 2 }}>
                          <span>100m</span><span>2000m</span>
                        </div>
                      </div>

                      {openSessionError && (
                        <p style={{ color: 'var(--k-danger)', fontSize: 12 }}>⚠️ {openSessionError}</p>
                      )}

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => { setShowOpenForm(false); setOpenSessionError('') }}
                          style={{
                            flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--k-border)',
                            background: 'var(--k-card2)', color: 'var(--k-muted)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                          }}
                        >Batal</button>
                        <button
                          type="button"
                          onClick={handleOpenSession}
                          disabled={openingSession}
                          style={{
                            flex: 2, padding: '12px', borderRadius: 12, border: 'none',
                            background: openingSession ? 'var(--k-border)' : 'rgba(79,70,229,0.85)',
                            color: openingSession ? 'var(--k-muted)' : '#fff',
                            fontWeight: 700, fontSize: 13,
                            cursor: openingSession ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          }}
                        >
                          {openingSession ? (
                            <>
                              <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                              Membuka...
                            </>
                          ) : '⚡ Buka Sesi'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Ada sesi aktif ── */}
              {jastipSession && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                  {/* Info sesi */}
                  <div style={{
                    background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.25)',
                    borderRadius: 16, padding: '14px 16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--k-text)' }}>
                        Sesi JastipQu Aktif
                      </p>
                      <span style={{
                        width: 10, height: 10, borderRadius: '50%', background: 'var(--k-accent)',
                        display: 'inline-block', animation: 'blink 2s infinite',
                      }} />
                    </div>

                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 2 }}>Kendaraan</p>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>
                          {jastipSession.vehicle_type === 'motor' ? '🏍️ Motor' : '🚗 Mobil'}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 2 }}>Kapasitas</p>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-accent)' }}>
                          {jastipSession.jastip_count ?? 0}/{jastipSession.max_jastip ?? 3} titipan
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 2 }}>Total Ongkir</p>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>
                          {fmtRp(jastipSession.total_jastip_fee ?? 0)}
                        </p>
                      </div>
                    </div>

                    <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(0,0,0,0.15)', borderRadius: 10 }}>
                      <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 2 }}>Rute</p>
                      <p style={{ fontSize: 12, color: 'var(--k-text)' }}>
                        {jastipSession.origin_address ?? `${jastipSession.origin_lat}, ${jastipSession.origin_lng}`} → {jastipSession.dest_address ?? `${jastipSession.destination_lat}, ${jastipSession.destination_lng}`}
                      </p>
                    </div>
                  </div>

                  {/* Daftar titipan */}
                  {Array.isArray(jastipSession.jastip_orders) && jastipSession.jastip_orders.length > 0 && (
                    <div style={{
                      background: 'var(--k-card)', border: '1px solid var(--k-border)',
                      borderRadius: 16, padding: '14px 16px',
                    }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Daftar Titipan
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {jastipSession.jastip_orders.map((order, idx) => (
                          <div key={order.id ?? idx} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 12px', borderRadius: 12,
                            background: 'var(--k-card2)', border: '1px solid var(--k-border)',
                          }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                              background: 'rgba(79,70,229,0.12)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                            }}>📦</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--k-text)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {order.customer?.name ?? order.customer_name ?? 'Pelanggan'}
                              </p>
                              <p style={{ fontSize: 11, color: 'var(--k-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {order.item_description ?? '—'}
                              </p>
                            </div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-accent)', flexShrink: 0 }}>
                              {fmtRp(order.shipping_fee ?? order.fee ?? 0)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {jastipSession.jastip_orders?.length === 0 && (
                    <div style={{
                      textAlign: 'center', padding: '16px',
                      background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 14,
                      color: 'var(--k-muted)', fontSize: 13,
                    }}>
                      Belum ada titipan masuk
                    </div>
                  )}

                  {closeSessionError && (
                    <p style={{ color: 'var(--k-danger)', fontSize: 12 }}>⚠️ {closeSessionError}</p>
                  )}

                  {/* Tombol tutup sesi */}
                  <button
                    onClick={handleCloseSession}
                    disabled={closingSession}
                    style={{
                      width: '100%', padding: '13px', borderRadius: 14, border: 'none',
                      background: closingSession ? 'var(--k-border)' : 'rgba(245,101,101,0.08)',
                      border: '1.5px solid rgba(245,101,101,0.3)',
                      color: closingSession ? 'var(--k-muted)' : 'var(--k-danger)',
                      fontWeight: 700, fontSize: 14,
                      cursor: closingSession ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    {closingSession ? (
                      <>
                        <span style={{ width: 14, height: 14, border: '2px solid rgba(245,101,101,0.3)', borderTopColor: 'var(--k-danger)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                        Menutup...
                      </>
                    ) : '🔴 Tutup Sesi'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
