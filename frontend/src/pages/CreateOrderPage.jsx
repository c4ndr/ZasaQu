import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GoogleMap, OverlayView } from '@react-google-maps/api'
import { getPosition } from '../utils/geo'
import { reverseGeocodeGoogle } from '../utils/googleMaps'
import LocationSearch from '../components/LocationSearch'
import MapSatToggle from '../components/MapSatToggle'
import useAppInfo from '../hooks/useAppInfo'
import api from '../services/api'
import useAddresses from '../hooks/useAddresses'
import VoucherInput from '../components/VoucherInput'

// ── SVG Pin marker ───────────────────────────────────────────────────────────
function PinMarker({ color }) {
  return (
    <div style={{ position: 'relative', width: 32, height: 40, pointerEvents: 'none' }}>
      <svg viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="40">
        <path d="M16 0C8.268 0 2 6.268 2 14c0 9.6 14 26 14 26S30 23.6 30 14C30 6.268 23.732 0 16 0z" fill={color} />
        <circle cx="16" cy="14" r="6" fill="white" />
      </svg>
    </div>
  )
}

const GPS_ERROR_MSG = {
  1: 'Izin lokasi ditolak. Ketuk "Izinkan" saat browser meminta akses lokasi.',
  2: 'Sinyal GPS tidak tersedia. Pastikan GPS perangkat aktif.',
  3: 'Waktu deteksi habis. Coba lagi atau ketuk peta secara manual.',
}

// ── Komponen Map Picker (Google Maps) ─────────────────────────────────────────
function LocationPicker({ label, color, lat, lng, address, onchange }) {
  const [geocoding, setGeocoding] = useState(false)
  const [locating,  setLocating]  = useState(false)
  const [gpsError,  setGpsError]  = useState('')
  const [mapType,   setMapType]   = useState('roadmap')
  const mapRef  = useRef(null)
  const position = (lat && lng) ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null

  const pick = useCallback(async (newLat, newLng) => {
    setGpsError('')
    onchange('lat', String(newLat))
    onchange('lng', String(newLng))
    setGeocoding(true)
    const addr = await reverseGeocodeGoogle(newLat, newLng)
    onchange('address', addr)
    setGeocoding(false)
  }, [onchange])

  // Pan ke posisi baru setelah pick
  useEffect(() => {
    if (!position || !mapRef.current) return
    mapRef.current.panTo({ lat: position.lat, lng: position.lng })
    mapRef.current.setZoom(15)
  }, [lat, lng]) // eslint-disable-line react-hooks/exhaustive-deps

  const detectLocation = async () => {
    setGpsError('')
    setLocating(true)
    try {
      const { lat: la, lng: lo } = await getPosition()
      await pick(la, lo)
    } catch (err) {
      const isHttpBlock = err.code === 1 && !window.isSecureContext
      setGpsError(isHttpBlock
        ? 'GPS diblokir browser karena koneksi HTTP. Ketuk peta untuk pilih lokasi manual.'
        : (GPS_ERROR_MSG[err.code] ?? 'Gagal mendeteksi lokasi. Ketuk peta untuk pilih manual.'))
    } finally {
      setLocating(false)
    }
  }

  const initCenter = position
    ? { lat: position.lat, lng: position.lng }
    : { lat: -6.2, lng: 106.816 }

  const MAP_OPTS = { disableDefaultUI: true, gestureHandling: 'greedy', clickableIcons: false }

  return (
    <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 20, overflow: 'hidden' }}>
      {/* Label + tombol GPS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <p style={{ color: 'var(--k-sub)', fontSize: 13, fontWeight: 700 }}>{label}</p>
        </div>
        <button type="button" onClick={detectLocation} disabled={locating}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: locating ? 'var(--k-card2)' : 'var(--k-glow)',
            color: 'var(--k-accent)', border: '1px solid rgba(0,200,150,0.25)',
            borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 700,
            cursor: locating ? 'not-allowed' : 'pointer', opacity: locating ? 0.7 : 1,
            transition: 'all 0.2s',
          }}>
          {locating
            ? <><span style={{ width: 12, height: 12, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Mendeteksi...</>
            : '📍 Lokasiku'
          }
        </button>
      </div>

      {gpsError && (
        <div style={{ margin: '0 12px 8px', padding: '9px 12px', borderRadius: 10, background: 'rgba(246,173,85,0.08)', border: '1px solid rgba(246,173,85,0.25)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
          <p style={{ color: 'var(--k-warn)', fontSize: 12, lineHeight: 1.5 }}>{gpsError}</p>
        </div>
      )}

      {/* Peta Google Maps */}
      <div style={{ height: 220, position: 'relative', cursor: 'crosshair' }}>
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={initCenter}
          zoom={position ? 15 : 12}
          options={{ ...MAP_OPTS, mapTypeId: mapType }}
          onLoad={map => { mapRef.current = map }}
          onClick={e => pick(e.latLng.lat(), e.latLng.lng())}
        >
          {position && (
            <OverlayView
              position={position}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h })}
            >
              <PinMarker color={color} />
            </OverlayView>
          )}
        </GoogleMap>

        <MapSatToggle mapType={mapType} onToggle={() => setMapType(t => t === 'roadmap' ? 'hybrid' : 'roadmap')} />

        {!position && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
            background: 'rgba(12,12,22,0.45)', zIndex: 1, gap: 6,
          }}>
            <span style={{ fontSize: 28 }}>👆</span>
            <p style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Ketuk peta untuk pilih lokasi</p>
          </div>
        )}
      </div>

      {/* Alamat */}
      <div style={{ padding: '10px 16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {geocoding ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderRadius: 12, background: 'var(--k-card2)', border: '1px solid var(--k-border)', color: 'var(--k-muted)', fontSize: 13 }}>
            <div style={{ width: 14, height: 14, border: '2px solid var(--k-border)', borderTopColor: 'var(--k-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
            Memuat alamat...
          </div>
        ) : (
          <LocationSearch
            value={address}
            onChange={val => onchange('address', val)}
            onSelect={({ lat: selLat, lng: selLng, display }) => {
              onchange('lat', String(selLat))
              onchange('lng', String(selLng))
              onchange('address', display)
            }}
            nearLat={position?.lat ?? null}
            nearLng={position?.lng ?? null}
            placeholder="Ketik nama tempat, warung, atau jalan..."
            confirmed={!!position}
          />
        )}
        {position && (
          <p style={{ color: 'var(--k-muted)', fontSize: 11, letterSpacing: '0.02em' }}>
            {parseFloat(lat).toFixed(6)}, {parseFloat(lng).toFixed(6)}
          </p>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Halaman utama ─────────────────────────────────────────────────────────────
export default function CreateOrderPage() {
  const navigate = useNavigate()
  const { addresses } = useAddresses()
  const { wallet_enabled: walletEnabled } = useAppInfo()
  const [categories,  setCategories]  = useState([])
  const [catError,    setCatError]    = useState(false)
  const [catLoading,  setCatLoading]  = useState(false)
  const [form, setForm] = useState({
    pickup_address: '', pickup_lat: '', pickup_lng: '',
    dropoff_address: '', dropoff_lat: '', dropoff_lng: '',
    item_category_id: '', item_description: '', item_value: '',
    vehicle_type: 'motor', shipping_fee: '',
    payment_method: 'cod', is_jastip_enabled: false,
    requires_disclaimer: false, require_photo: false, notes: '',
  })
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [estimate,   setEstimate]   = useState(null)
  const [estimating, setEstimating] = useState(false)
  const [promo,      setPromo]      = useState({ promoCode: null, discountAmount: 0 })

  const fetchCategories = useCallback((isRetry = false) => {
    setCatError(false)
    setCatLoading(true)
    api.get('/item-categories')
      .then(r => { setCategories(Array.isArray(r.data) ? r.data : []); setCatLoading(false) })
      .catch(() => {
        setCatLoading(false)
        if (!isRetry) {
          setTimeout(() => fetchCategories(true), 2500)
        } else {
          setCatError(true)
        }
      })
  }, [])
  useEffect(() => { fetchCategories() }, [fetchCategories])

  const calcShipping = useCallback(async (f) => {
    if (!f.pickup_lat || !f.pickup_lng || !f.dropoff_lat || !f.dropoff_lng) return
    setEstimating(true)
    try {
      const res = await api.get('/shipping/estimate', {
        params: { pickup_lat: f.pickup_lat, pickup_lng: f.pickup_lng, dropoff_lat: f.dropoff_lat, dropoff_lng: f.dropoff_lng, vehicle_type: f.vehicle_type }
      })
      setEstimate(res.data)
      setForm(prev => ({ ...prev, shipping_fee: res.data.shipping_fee }))
    } catch { /* abaikan error estimasi */ }
    finally { setEstimating(false) }
  }, [])

  const handleChange = e => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => {
      const next = { ...f, [e.target.name]: val }
      if (e.target.name === 'vehicle_type') calcShipping(next)
      return next
    })
  }

  const onPickup = useCallback((field, val) => {
    setForm(f => {
      const next = { ...f, [`pickup_${field}`]: val }
      calcShipping(next)
      return next
    })
  }, [calcShipping])

  const onDropoff = useCallback((field, val) => {
    setForm(f => {
      const next = { ...f, [`dropoff_${field}`]: val }
      calcShipping(next)
      return next
    })
  }, [calcShipping])

  const selectedCat = categories.find(c => String(c.id) === String(form.item_category_id))

  const handleSubmit = async e => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const payload = {
        ...form,
        shipping_fee: Number(form.shipping_fee),
        item_value:   Number(form.item_value) || 0,
        pickup_lat:   parseFloat(form.pickup_lat),
        pickup_lng:   parseFloat(form.pickup_lng),
        dropoff_lat:  parseFloat(form.dropoff_lat),
        dropoff_lng:  parseFloat(form.dropoff_lng),
        ...(promo.promoCode ? { promo_code: promo.promoCode } : {}),
      }
      await api.post('/orders', payload)
      navigate('/orders')
    } catch (err) {
      const errs = err.response?.data?.errors
      setError(errs ? Object.values(errs).flat().join(' ') : (err.response?.data?.message || 'Gagal membuat order.'))
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', paddingBottom: 32 }}>

      <nav style={{ background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 30 }}>
        <Link to="/orders" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--k-card)', border: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--k-muted)', textDecoration: 'none', fontSize: 18 }}>←</Link>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 800, color: 'var(--k-text)', lineHeight: 1.2 }}>Buat Order</h1>
          <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>Ketuk peta atau gunakan GPS otomatis</p>
        </div>
      </nav>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px' }}>

        {error && <div className="error-box fade-in" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <LocationPicker label="Lokasi Pickup" color="#00C896" lat={form.pickup_lat} lng={form.pickup_lng} address={form.pickup_address} onchange={onPickup} />

          {addresses.length > 0 && (
            <div>
              <p style={{ color: 'var(--k-sub)', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>📒 Alamat Tersimpan</p>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {addresses.map(addr => (
                  <button key={addr.id} type="button"
                    onClick={() => { onDropoff('lat', String(addr.lat)); onDropoff('lng', String(addr.lng)); onDropoff('address', addr.address) }}
                    style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 20, border: '1.5px solid var(--k-border)', background: form.dropoff_address === addr.address ? 'rgba(99,102,241,0.12)' : 'var(--k-card)', color: form.dropoff_address === addr.address ? 'var(--k-primary)' : 'var(--k-text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {addr.label === 'Rumah' ? '🏠' : addr.label === 'Kantor' ? '🏢' : '📌'} {addr.label}{addr.is_default ? ' ★' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          <LocationPicker label="Lokasi Tujuan" color="#F56565" lat={form.dropoff_lat} lng={form.dropoff_lng} address={form.dropoff_address} onchange={onDropoff} />

          {/* Detail Barang */}
          <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 20, padding: '16px' }}>
            <p style={{ color: 'var(--k-sub)', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Detail Barang</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="label">Kategori Barang</label>
                {catError ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(245,101,101,0.07)', border: '1px solid rgba(245,101,101,0.2)' }}>
                    <p style={{ flex: 1, color: 'var(--k-danger)', fontSize: 12 }}>⚠ Gagal memuat kategori.</p>
                    <button type="button" onClick={() => fetchCategories(false)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'var(--k-danger)', color: '#fff', border: 'none', cursor: 'pointer' }}>Coba Lagi</button>
                  </div>
                ) : (
                  <select name="item_category_id" value={form.item_category_id} onChange={handleChange} className="input-field" style={{ cursor: catLoading ? 'wait' : 'pointer' }} disabled={catLoading}>
                    <option value="">{catLoading ? '⏳ Memuat kategori...' : 'Pilih kategori barang'}</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>

              {(selectedCat?.requires_disclaimer || Number(form.item_value) > 200000) && (
                <div style={{ background: 'rgba(246,173,85,0.08)', border: '1px solid rgba(246,173,85,0.2)', borderRadius: 14, padding: '12px 14px' }}>
                  <p style={{ color: 'var(--k-warn)', fontSize: 12, marginBottom: 10 }}>
                    {Number(form.item_value) > 200000
                      ? '⚠️ Nilai barang melebihi Rp200.000. Risiko kehilangan/kerusakan ditanggung pengirim.'
                      : '⚠️ Barang ini memerlukan disclaimer risiko kerusakan.'}
                  </p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" name="requires_disclaimer" checked={form.requires_disclaimer} onChange={handleChange} style={{ accentColor: 'var(--k-accent)', width: 16, height: 16 }} />
                    <span style={{ color: 'var(--k-sub)', fontSize: 13 }}>Saya mengerti dan menyetujui risiko</span>
                  </label>
                </div>
              )}

              <div>
                <label className="label">Deskripsi Barang</label>
                <input className="input-field" type="text" name="item_description" value={form.item_description} onChange={handleChange} required placeholder="Contoh: Paket dokumen A4" />
              </div>
              <div>
                <label className="label">Nilai Barang (opsional)</label>
                <input className="input-field" type="number" name="item_value" min="0" value={form.item_value} onChange={handleChange} placeholder="Rp — untuk keperluan asuransi" />
              </div>
            </div>
          </div>

          {/* Armada & Pembayaran */}
          <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 20, padding: '16px' }}>
            <p style={{ color: 'var(--k-sub)', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Armada & Pembayaran</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">Tipe Armada</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[{ v: 'motor', emoji: '🏍️', label: 'Motor' }, { v: 'mobil', emoji: '🚗', label: 'Mobil' }].map(({ v, emoji, label }) => (
                    <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, cursor: 'pointer', border: `1.5px solid ${form.vehicle_type === v ? 'var(--k-accent)' : 'var(--k-border)'}`, background: form.vehicle_type === v ? 'var(--k-glow)' : 'var(--k-card2)', transition: 'all 0.2s' }}>
                      <input type="radio" name="vehicle_type" value={v} checked={form.vehicle_type === v} onChange={handleChange} style={{ display: 'none' }} />
                      <span style={{ fontSize: 20 }}>{emoji}</span>
                      <span style={{ color: 'var(--k-text)', fontSize: 14, fontWeight: 600 }}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Ongkos Kirim</label>
                {estimate ? (
                  <div style={{ background: 'var(--k-glow)', border: '1px solid rgba(0,200,150,0.3)', borderRadius: 14, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>🧮</span>
                        <span style={{ color: 'var(--k-muted)', fontSize: 12 }}>Dihitung otomatis</span>
                      </div>
                      <p style={{ color: 'var(--k-accent)', fontSize: 22, fontWeight: 900 }}>Rp {Number(form.shipping_fee).toLocaleString('id-ID')}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--k-muted)', fontSize: 11 }}>📍 {estimate.distance_km} km</span>
                      <span style={{ color: 'var(--k-muted)', fontSize: 11 }}>Biaya dasar: Rp {Number(estimate.breakdown.base_fee).toLocaleString('id-ID')}</span>
                      <span style={{ color: 'var(--k-muted)', fontSize: 11 }}>Per km: Rp {Number(estimate.breakdown.per_km).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: 'var(--k-card2)', border: '1px solid var(--k-border)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    {estimating
                      ? <><div style={{ width: 16, height: 16, border: '2px solid var(--k-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} /><span style={{ color: 'var(--k-muted)', fontSize: 13 }}>Menghitung ongkir...</span></>
                      : <><span style={{ fontSize: 16 }}>📍</span><span style={{ color: 'var(--k-muted)', fontSize: 13 }}>Pilih lokasi pickup & tujuan untuk menghitung ongkir</span></>
                    }
                  </div>
                )}
              </div>

              <div>
                <label className="label">Metode Pembayaran</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[{ v: 'wallet', emoji: '💳', label: 'Saldo Wallet' }, { v: 'cod', emoji: '💵', label: 'COD / Tunai' }].filter(({ v }) => v !== 'wallet' || walletEnabled).map(({ v, emoji, label }) => (
                    <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, cursor: 'pointer', border: `1.5px solid ${form.payment_method === v ? 'var(--k-accent)' : 'var(--k-border)'}`, background: form.payment_method === v ? 'var(--k-glow)' : 'var(--k-card2)', transition: 'all 0.2s' }}>
                      <input type="radio" name="payment_method" value={v} checked={form.payment_method === v} onChange={handleChange} style={{ display: 'none' }} />
                      <span style={{ fontSize: 18 }}>{emoji}</span>
                      <span style={{ color: 'var(--k-text)', fontSize: 13, fontWeight: 600 }}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {estimate && (
                <VoucherInput
                  orderAmount={Number(form.shipping_fee)}
                  module="zasago"
                  onApply={({ promoCode, discountAmount }) => setPromo({ promoCode, discountAmount })}
                  onClear={() => setPromo({ promoCode: null, discountAmount: 0 })}
                />
              )}

              {promo.discountAmount > 0 && (
                <div style={{ background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.2)', borderRadius: 14, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--k-muted)' }}>Ongkir setelah diskon</span>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 12, color: 'var(--k-muted)', textDecoration: 'line-through' }}>Rp {Number(form.shipping_fee).toLocaleString('id-ID')}</p>
                    <p style={{ fontSize: 16, fontWeight: 900, color: 'var(--k-accent)' }}>Rp {Math.max(0, Number(form.shipping_fee) - promo.discountAmount).toLocaleString('id-ID')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer', background: form.is_jastip_enabled ? 'rgba(0,200,150,0.06)' : 'var(--k-card)', border: `1.5px solid ${form.is_jastip_enabled ? 'var(--k-accent)' : 'var(--k-border)'}`, borderRadius: 20, padding: '14px 16px', transition: 'all 0.2s' }}>
            <div style={{ paddingTop: 2 }}>
              <input type="checkbox" name="is_jastip_enabled" checked={form.is_jastip_enabled} onChange={handleChange} style={{ accentColor: 'var(--k-accent)', width: 18, height: 18 }} />
            </div>
            <div>
              <p style={{ color: 'var(--k-text)', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>⚡ Izinkan JastipQu</p>
              <p style={{ color: 'var(--k-muted)', fontSize: 12, lineHeight: 1.6 }}>Mitra bisa titip barang tambahan searah rute Anda. Dapatkan diskon ongkos kirim di akhir.</p>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer', background: form.require_photo ? 'rgba(0,200,150,0.06)' : 'var(--k-card)', border: `1.5px solid ${form.require_photo ? 'var(--k-accent)' : 'var(--k-border)'}`, borderRadius: 20, padding: '14px 16px', transition: 'all 0.2s' }}>
            <div style={{ paddingTop: 2 }}>
              <input type="checkbox" name="require_photo" checked={form.require_photo} onChange={handleChange} style={{ accentColor: 'var(--k-accent)', width: 18, height: 18 }} />
            </div>
            <div>
              <p style={{ color: 'var(--k-text)', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>📸 Wajib Foto di Setiap Tahap</p>
              <p style={{ color: 'var(--k-muted)', fontSize: 12, lineHeight: 1.6 }}>Mitra wajib memfoto saat tiba di pickup, saat barang dikemas, dan saat sampai tujuan sebelum bisa melanjutkan ke tahap berikutnya.</p>
            </div>
          </label>

          <div>
            <label className="label">Catatan (opsional)</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} placeholder="Contoh: Tolong berhati-hati, barang mudah pecah"
              style={{ width: '100%', background: 'var(--k-card2)', border: '1.5px solid var(--k-border)', color: 'var(--k-text)', padding: '12px 16px', borderRadius: 14, fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />
          </div>

          <button type="submit" className="btn-primary" disabled={loading || !estimate || estimating}>
            {loading ? 'Membuat Order...' : !estimate ? 'Pilih lokasi dulu' : 'Buat Order Sekarang'}
          </button>
        </form>
      </div>
    </div>
  )
}
