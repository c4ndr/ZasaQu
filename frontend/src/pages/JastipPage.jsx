import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import BottomNav from '../components/BottomNav'
import LocationSearch from '../components/LocationSearch'
import SessionRouteMap from '../components/SessionRouteMap'

const fmt = (v) => 'Rp ' + Number(v ?? 0).toLocaleString('id-ID')

const VEHICLE_TYPES = [
  { value: 'motor', label: 'Motor', icon: '🏍️' },
  { value: 'mobil', label: 'Mobil', icon: '🚗' },
]

export default function JastipPage() {
  const navigate = useNavigate()

  const [step, setStep] = useState('results')

  // ── State results ──────────────────────────────────────────────────────────
  const [vehicleType,   setVehicleType]   = useState('motor')
  const [searchAddr,    setSearchAddr]    = useState('')
  const [searchLat,     setSearchLat]     = useState('')
  const [searchLng,     setSearchLng]     = useState('')
  const [searchingAddr, setSearchingAddr] = useState(false)
  const [searching,     setSearching]     = useState(false)
  const [sessions,      setSessions]      = useState([])
  const [openMapSession, setOpenMapSession] = useState(null)
  const [listError,     setListError]     = useState('')

  // ── State order form ───────────────────────────────────────────────────────
  const [selectedSession, setSelectedSession] = useState(null)
  const [pickupAddr,  setPickupAddr]  = useState('')
  const [pickupLat,   setPickupLat]   = useState('')
  const [pickupLng,   setPickupLng]   = useState('')
  const [destAddr,    setDestAddr]    = useState('')
  const [destLat,     setDestLat]     = useState('')
  const [destLng,     setDestLng]     = useState('')
  const [itemDesc,    setItemDesc]    = useState('')
  const [itemValue,   setItemValue]   = useState('')
  const [payMethod,   setPayMethod]   = useState('wallet')
  const [shippingFee, setShippingFee] = useState(null)
  const [feeLoading,  setFeeLoading]  = useState(false)
  const [feeError,    setFeeError]    = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [submitError, setSubmitError] = useState('')

  // ── Load sesi saat pertama buka & saat vehicle type berubah ───────────────
  useEffect(() => { loadSessions(vehicleType) }, [vehicleType]) // eslint-disable-line

  async function loadSessions(vt, lat, lng) {
    setSearching(true)
    setListError('')
    try {
      const params = { vehicle_type: vt ?? vehicleType }
      if (lat && lng) { params.lat = lat; params.lng = lng }
      const res = await api.get('/jastip/sessions/available', { params })
      setSessions(res.data?.data ?? res.data ?? [])
    } catch (e) {
      setSessions([])
      setListError(e?.response?.data?.message ?? 'Gagal memuat sesi. Coba refresh.')
    } finally {
      setSearching(false)
    }
  }

  // ── Cari sesi dengan filter lokasi ────────────────────────────────────────
  async function handleSearch() {
    if (searchAddr.trim() && !searchLat) {
      setListError('Pilih lokasi dari saran, atau kosongkan kolom pencarian.')
      return
    }
    loadSessions(vehicleType, searchLat || undefined, searchLng || undefined)
  }

  // ── Pilih sesi → buka form order ──────────────────────────────────────────
  function handleSelectSession(sess) {
    setSelectedSession(sess)
    setPickupAddr(''); setPickupLat(''); setPickupLng('')
    setDestAddr('');   setDestLat('');   setDestLng('')
    setItemDesc('');   setItemValue(''); setPayMethod('wallet')
    setShippingFee(null); setFeeError(''); setSubmitError('')
    setStep('order')
  }

  // ── GPS auto-fill lokasi pickup ───────────────────────────────────────────
  function detectGps(onSuccess) {
    if (!window.isSecureContext) {
      setSubmitError('GPS diblokir (HTTP). Ketik alamat manual, atau akses lewat localhost.')
      return
    }
    if (!navigator.geolocation) { setSubmitError('Browser tidak mendukung GPS.'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => onSuccess(pos.coords.latitude, pos.coords.longitude),
      () => setSubmitError('Gagal deteksi lokasi. Coba ketik manual.'),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  // ── Estimasi ongkir otomatis saat koordinat terisi ────────────────────────
  const estimateShipping = useCallback(async () => {
    if (!pickupLat || !pickupLng || !destLat || !destLng) return
    setFeeLoading(true); setFeeError('')
    try {
      const res = await api.get('/shipping/estimate', {
        params: {
          pickup_lat:   pickupLat, pickup_lng:  pickupLng,
          dropoff_lat:  destLat,   dropoff_lng: destLng,
          vehicle_type: selectedSession?.vehicle_type ?? vehicleType,
        },
      })
      setShippingFee(res.data?.shipping_fee ?? res.data?.fee ?? null)
    } catch {
      setFeeError('Gagal estimasi ongkir.')
    } finally {
      setFeeLoading(false)
    }
  }, [pickupLat, pickupLng, destLat, destLng, selectedSession, vehicleType])

  useEffect(() => {
    if (step === 'order') estimateShipping()
  }, [pickupLat, pickupLng, destLat, destLng, step, estimateShipping])

  // ── Submit order ──────────────────────────────────────────────────────────
  async function handleSubmitOrder(e) {
    e.preventDefault()
    if (!pickupAddr.trim())       { setSubmitError('Lokasi pickup wajib diisi.'); return }
    if (!pickupLat || !pickupLng) { setSubmitError('Pilih lokasi pickup dari saran.'); return }
    if (!destAddr.trim())         { setSubmitError('Lokasi tujuan wajib diisi.'); return }
    if (!destLat || !destLng)     { setSubmitError('Pilih lokasi tujuan dari saran.'); return }
    if (!itemDesc.trim())         { setSubmitError('Deskripsi barang wajib diisi.'); return }
    if (!shippingFee)             { setSubmitError('Ongkir belum dihitung. Tunggu sebentar.'); return }

    setSubmitting(true); setSubmitError('')
    try {
      await api.post(`/jastip/sessions/${selectedSession.id}/order`, {
        pickup_address:   pickupAddr,
        pickup_lat:       parseFloat(pickupLat),
        pickup_lng:       parseFloat(pickupLng),
        dropoff_address:  destAddr,
        dropoff_lat:      parseFloat(destLat),
        dropoff_lng:      parseFloat(destLng),
        item_description: itemDesc,
        item_value:       itemValue ? parseFloat(itemValue) : undefined,
        shipping_fee:     shippingFee,
        payment_method:   payMethod,
      })
      navigate('/orders')
    } catch (e) {
      setSubmitError(e?.response?.data?.message ?? 'Gagal membuat order. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Topbar ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)',
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        {step === 'order' ? (
          <button onClick={() => setStep('results')} style={{
            width: 38, height: 38, borderRadius: 10, border: '1px solid var(--k-border)',
            background: 'var(--k-card)', color: 'var(--k-text)', fontSize: 18,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>←</button>
        ) : (
          <Link to="/dashboard" style={{
            width: 38, height: 38, borderRadius: 10, border: '1px solid var(--k-border)',
            background: 'var(--k-card)', color: 'var(--k-text)', fontSize: 18,
            textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>←</Link>
        )}
        <div>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--k-text)', lineHeight: 1.2 }}>⚡ JastipQu</p>
          <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>
            {step === 'results' && (searching ? 'Memuat sesi...' : `${sessions.length} mitra tersedia`)}
            {step === 'order'   && 'Form pemesanan titipan'}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {['results', 'order'].map((s) => (
            <div key={s} style={{
              width: step === s ? 20 : 8, height: 8, borderRadius: 100,
              background: step === s ? 'var(--k-accent)' : 'var(--k-border)',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>
      </header>

      <div style={{ flex: 1, padding: '16px', paddingBottom: 80, maxWidth: 480, margin: '0 auto', width: '100%' }}>

        {/* ════════ RESULTS ════════ */}
        {step === 'results' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Filter kendaraan + refresh */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {VEHICLE_TYPES.map(v => (
                <button key={v.value} onClick={() => setVehicleType(v.value)} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 12,
                  border: vehicleType === v.value ? '2px solid var(--k-accent)' : '1.5px solid var(--k-border)',
                  background: vehicleType === v.value ? 'rgba(0,200,150,0.08)' : 'var(--k-card)',
                  color: vehicleType === v.value ? 'var(--k-accent)' : 'var(--k-muted)',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  {v.icon} {v.label}
                </button>
              ))}
              <button onClick={() => loadSessions(vehicleType)} disabled={searching} style={{
                padding: '10px 14px', borderRadius: 12, border: '1px solid var(--k-border)',
                background: 'var(--k-card)', color: 'var(--k-muted)', fontSize: 18, cursor: 'pointer',
              }} title="Refresh">🔄</button>
            </div>

            {/* Filter lokasi (cari sesi terdekat) */}
            <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: '12px 14px' }}>
              <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 8 }}>
                🔍 Cari sesi terdekat (opsional)
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <LocationSearch
                    value={searchAddr}
                    confirmed={!!searchLat}
                    placeholder="Kota atau kecamatan Anda..."
                    onChange={v => { setSearchAddr(v); setSearchLat(''); setSearchLng('') }}
                    onSelect={r => { setSearchAddr(r.display); setSearchLat(String(r.lat)); setSearchLng(String(r.lng)) }}
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={searching || searchingAddr}
                  style={{
                    padding: '12px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: 'rgba(0,200,150,0.12)', color: 'var(--k-accent)',
                    fontWeight: 700, fontSize: 13, flexShrink: 0,
                    opacity: searching ? 0.6 : 1,
                  }}
                >
                  {searching ? '⏳' : 'Cari'}
                </button>
              </div>
              {searchLat && <p style={{ fontSize: 11, color: 'var(--k-accent)', marginTop: 6 }}>✓ Filter aktif — menampilkan sesi terdekat</p>}
              {searchLat && (
                <button onClick={() => { setSearchAddr(''); setSearchLat(''); setSearchLng(''); loadSessions(vehicleType) }}
                  style={{ fontSize: 11, color: 'var(--k-muted)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, padding: 0 }}>
                  × Hapus filter
                </button>
              )}
              {listError && <p style={{ color: 'var(--k-warn)', fontSize: 12, marginTop: 6 }}>⚠️ {listError}</p>}
            </div>

            {/* Daftar sesi */}
            {searching ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                <div style={{ width: 28, height: 28, border: '2.5px solid var(--k-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : sessions.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '48px 24px',
                background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 20,
              }}>
                <p style={{ fontSize: 40, marginBottom: 12 }}>😔</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--k-text)', marginBottom: 6 }}>
                  Belum Ada Mitra JastipQu
                </p>
                <p style={{ fontSize: 13, color: 'var(--k-muted)', lineHeight: 1.6 }}>
                  Belum ada mitra yang membuka sesi untuk {vehicleType === 'motor' ? 'motor' : 'mobil'} saat ini.
                </p>
              </div>
            ) : (
              sessions.map(sess => {
                const sisaKapasitas = (sess.max_jastip ?? 3) - (sess.jastip_count ?? 0)
                const isFull   = sisaKapasitas <= 0
                const isOnline = sess.mitra?.mitra_detail?.is_online === true
                return (
                  <div key={sess.id} style={{
                    background: 'var(--k-card)',
                    border: `1px solid ${isFull ? 'var(--k-border)' : isOnline ? 'rgba(0,200,150,0.35)' : 'rgba(79,70,229,0.25)'}`,
                    borderRadius: 18, padding: '16px',
                    opacity: isFull ? 0.55 : 1, transition: 'all 0.2s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: isOnline ? 'rgba(0,200,150,0.12)' : 'rgba(79,70,229,0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                          }}>
                            {sess.vehicle_type === 'motor' ? '🏍️' : '🚗'}
                          </div>
                          <div style={{
                            position: 'absolute', bottom: -2, right: -2,
                            width: 12, height: 12, borderRadius: '50%',
                            background: isOnline ? 'var(--k-accent)' : 'var(--k-muted)',
                            border: '2px solid var(--k-card)',
                          }} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--k-text)' }}>
                              {sess.mitra?.name ?? 'Mitra'}
                            </p>
                            {isOnline && (
                              <span style={{
                                padding: '1px 7px', borderRadius: 100, fontSize: 10, fontWeight: 700,
                                background: 'rgba(0,200,150,0.12)', color: 'var(--k-accent)',
                                border: '1px solid rgba(0,200,150,0.3)',
                              }}>GPS Aktif</span>
                            )}
                          </div>
                          <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>
                            {sess.vehicle_type === 'motor' ? 'Motor' : 'Mobil'}
                            {!isOnline && <span style={{ marginLeft: 6 }}>· Offline</span>}
                          </p>
                        </div>
                      </div>
                      <span style={{
                        padding: '4px 10px', borderRadius: 100,
                        background: 'rgba(79,70,229,0.12)', border: '1px solid rgba(79,70,229,0.25)',
                        fontSize: 11, fontWeight: 700, color: '#818CF8', flexShrink: 0,
                      }}>⚡ JastipQu</span>
                    </div>

                    <div style={{
                      background: 'var(--k-card2)', borderRadius: 12, padding: '10px 12px', marginBottom: 12,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 2 }}>Dari</p>
                        <p style={{ fontSize: 13, color: 'var(--k-text)', fontWeight: 600 }}>
                          {sess.origin_address ?? `${sess.origin_lat}, ${sess.origin_lng}`}
                        </p>
                      </div>
                      <span style={{ color: 'var(--k-muted)', fontSize: 18 }}>→</span>
                      <div style={{ flex: 1, textAlign: 'right' }}>
                        <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 2 }}>Ke</p>
                        <p style={{ fontSize: 13, color: 'var(--k-text)', fontWeight: 600 }}>
                          {sess.dest_address ?? `${sess.destination_lat}, ${sess.destination_lng}`}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12 }}>📦</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: sisaKapasitas <= 1 ? 'var(--k-warn)' : 'var(--k-accent)' }}>
                          {isFull ? 'Penuh' : `Sisa ${sisaKapasitas} slot`}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--k-muted)' }}>
                          ({sess.jastip_count ?? 0}/{sess.max_jastip ?? 3})
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => setOpenMapSession(openMapSession === sess.id ? null : sess.id)}
                          style={{
                            padding: '10px 14px', borderRadius: 12,
                            border: '1px solid var(--k-border)',
                            background: openMapSession === sess.id ? 'rgba(129,140,248,0.12)' : 'var(--k-card2)',
                            color: openMapSession === sess.id ? '#818CF8' : 'var(--k-muted)',
                            fontWeight: 700, fontSize: 12, cursor: 'pointer',
                          }}
                        >
                          {openMapSession === sess.id ? '🗺️ Tutup' : '🗺️ Rute'}
                        </button>
                        <button
                          onClick={() => !isFull && handleSelectSession(sess)}
                          disabled={isFull}
                          style={{
                            padding: '10px 20px', borderRadius: 12, border: 'none',
                            background: isFull ? 'var(--k-border)' : 'var(--k-accent)',
                            color: isFull ? 'var(--k-muted)' : '#0C0C16',
                            fontWeight: 700, fontSize: 13,
                            cursor: isFull ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                          }}
                        >
                          {isFull ? 'Penuh' : 'Titipkan'}
                        </button>
                      </div>
                    </div>

                    {openMapSession === sess.id && <SessionRouteMap session={sess} height={200} />}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ════════ ORDER FORM ════════ */}
        {step === 'order' && selectedSession && (
          <form onSubmit={handleSubmitOrder} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Info sesi terpilih */}
            <div style={{
              background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)',
              borderRadius: 16, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 24 }}>{selectedSession.vehicle_type === 'motor' ? '🏍️' : '🚗'}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', marginBottom: 2 }}>
                  {selectedSession.mitra?.name ?? 'Mitra'}
                </p>
                <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>
                  {selectedSession.origin_address ?? `${selectedSession.origin_lat}, ${selectedSession.origin_lng}`} → {selectedSession.dest_address ?? `${selectedSession.destination_lat}, ${selectedSession.destination_lng}`}
                </p>
              </div>
              <span style={{
                marginLeft: 'auto', padding: '4px 10px', borderRadius: 100,
                background: 'rgba(79,70,229,0.12)', border: '1px solid rgba(79,70,229,0.25)',
                fontSize: 11, fontWeight: 700, color: '#818CF8', flexShrink: 0,
              }}>⚡ JastipQu</span>
            </div>

            {/* ── Lokasi Pickup ── */}
            <div style={{ background: 'var(--k-card)', border: `1px solid ${pickupLat ? 'rgba(0,200,150,0.3)' : 'var(--k-border)'}`, borderRadius: 18, padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  📍 Lokasi Pickup
                </p>
                <button
                  type="button"
                  onClick={() => detectGps((lat, lng) => {
                    setPickupLat(lat.toFixed(6)); setPickupLng(lng.toFixed(6))
                    setPickupAddr(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
                  })}
                  style={{
                    padding: '5px 10px', borderRadius: 8, border: '1px solid var(--k-border)',
                    background: 'var(--k-card2)', color: 'var(--k-muted)', fontSize: 11,
                    fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  📡 Lokasi Saya
                </button>
              </div>
              <LocationSearch
                value={pickupAddr}
                confirmed={!!pickupLat}
                placeholder="Ketik nama jalan atau gedung..."
                onChange={v => { setPickupAddr(v); setPickupLat(''); setPickupLng('') }}
                onSelect={r => { setPickupAddr(r.display); setPickupLat(String(r.lat)); setPickupLng(String(r.lng)) }}
              />
              {pickupLat && (
                <p style={{ fontSize: 11, color: 'var(--k-accent)', marginTop: 6 }}>
                  ✓ {parseFloat(pickupLat).toFixed(5)}, {parseFloat(pickupLng).toFixed(5)}
                </p>
              )}
            </div>

            {/* ── Lokasi Tujuan ── */}
            <div style={{ background: 'var(--k-card)', border: `1px solid ${destLat ? 'rgba(0,200,150,0.3)' : 'var(--k-border)'}`, borderRadius: 18, padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  🏁 Lokasi Tujuan
                </p>
                <button
                  type="button"
                  onClick={() => detectGps((lat, lng) => {
                    setDestLat(lat.toFixed(6)); setDestLng(lng.toFixed(6))
                    setDestAddr(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
                  })}
                  style={{
                    padding: '5px 10px', borderRadius: 8, border: '1px solid var(--k-border)',
                    background: 'var(--k-card2)', color: 'var(--k-muted)', fontSize: 11,
                    fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  📡 Lokasi Saya
                </button>
              </div>
              <LocationSearch
                value={destAddr}
                confirmed={!!destLat}
                placeholder="Ketik nama jalan atau gedung..."
                onChange={v => { setDestAddr(v); setDestLat(''); setDestLng('') }}
                onSelect={r => { setDestAddr(r.display); setDestLat(String(r.lat)); setDestLng(String(r.lng)) }}
              />
              {destLat && (
                <p style={{ fontSize: 11, color: 'var(--k-accent)', marginTop: 6 }}>
                  ✓ {parseFloat(destLat).toFixed(5)}, {parseFloat(destLng).toFixed(5)}
                </p>
              )}
            </div>

            {/* ── Detail Barang ── */}
            <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 18, padding: '16px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Detail Barang
              </p>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: 'var(--k-muted)', display: 'block', marginBottom: 6 }}>Deskripsi Barang *</label>
                <textarea
                  value={itemDesc}
                  onChange={e => setItemDesc(e.target.value)}
                  placeholder="Contoh: Makanan 2 bungkus nasi padang + es teh"
                  required rows={3}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12,
                    background: 'var(--k-card2)', border: '1px solid var(--k-border)',
                    color: 'var(--k-text)', fontSize: 14, outline: 'none',
                    resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--k-muted)', display: 'block', marginBottom: 6 }}>Nilai Barang (opsional)</label>
                <input
                  value={itemValue}
                  onChange={e => setItemValue(e.target.value)}
                  type="number" min="0" placeholder="Contoh: 50000"
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12,
                    background: 'var(--k-card2)', border: '1px solid var(--k-border)',
                    color: 'var(--k-text)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* ── Metode Bayar ── */}
            <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 18, padding: '16px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Metode Pembayaran
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                {[{ value: 'wallet', label: 'Wallet', icon: '💳' }, { value: 'cod', label: 'COD', icon: '💵' }].map(m => (
                  <button key={m.value} type="button" onClick={() => setPayMethod(m.value)} style={{
                    flex: 1, padding: '12px 8px', borderRadius: 14,
                    border: payMethod === m.value ? '2px solid var(--k-accent)' : '1.5px solid var(--k-border)',
                    background: payMethod === m.value ? 'rgba(0,200,150,0.08)' : 'var(--k-card2)',
                    cursor: 'pointer', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                    <span style={{ fontSize: 18 }}>{m.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: payMethod === m.value ? 'var(--k-accent)' : 'var(--k-text)' }}>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Estimasi Ongkir ── */}
            <div style={{
              background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 18, padding: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 4 }}>Estimasi Ongkos Kirim</p>
                {feeLoading ? (
                  <p style={{ fontSize: 14, color: 'var(--k-muted)' }}>Menghitung...</p>
                ) : feeError ? (
                  <p style={{ fontSize: 13, color: 'var(--k-warn)' }}>{feeError}</p>
                ) : shippingFee !== null ? (
                  <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--k-accent)' }}>{fmt(shippingFee)}</p>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--k-muted)' }}>Isi koordinat pickup & tujuan untuk estimasi otomatis</p>
                )}
              </div>
              <span style={{ fontSize: 28 }}>🚚</span>
            </div>

            {submitError && (
              <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(245,101,101,0.08)', border: '1px solid rgba(245,101,101,0.25)' }}>
                <p style={{ color: 'var(--k-danger)', fontSize: 13 }}>⚠️ {submitError}</p>
              </div>
            )}

            <button type="submit" disabled={submitting} style={{
              width: '100%', padding: '16px', borderRadius: 16, border: 'none',
              background: submitting ? 'var(--k-border)' : 'var(--k-accent)',
              color: submitting ? 'var(--k-muted)' : '#0C0C16',
              fontWeight: 800, fontSize: 15,
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'all 0.2s',
            }}>
              {submitting ? (
                <>
                  <span style={{ width: 18, height: 18, border: '2.5px solid rgba(0,0,0,0.2)', borderTopColor: '#0C0C16', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                  Memproses...
                </>
              ) : '⚡ Pesan Titipan'}
            </button>
          </form>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder, textarea::placeholder { color: var(--k-muted); }
      `}</style>

      <BottomNav />
    </div>
  )
}
