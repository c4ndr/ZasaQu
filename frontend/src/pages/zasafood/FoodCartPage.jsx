import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../../services/api'

function fmtRp(v) { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }

// ── Mini peta picker lokasi pengiriman ────────────────────────────────────────
// Pakai nominatim untuk reverse geocoding, minta GPS atau search teks
function LocationPicker({ lat, lng, address, onChange }) {
  const [mode,    setMode]    = useState('gps')   // 'gps' | 'search'
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [finding, setFinding] = useState(false)
  const [gpsErr,  setGpsErr]  = useState('')
  const timerRef = useRef(null)

  // Auto-detect GPS saat komponen pertama mount
  useEffect(() => {
    detectGps()
  }, []) // eslint-disable-line

  function detectGps() {
    if (!navigator.geolocation) {
      setGpsErr('GPS tidak tersedia di browser ini.')
      return
    }
    setFinding(true); setGpsErr('')
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: la, longitude: lo } = pos.coords
        // Reverse geocode ke nama jalan
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${la}&lon=${lo}&format=json&accept-language=id`)
          .then(r => r.json())
          .then(data => {
            const addr = data.display_name || `${la.toFixed(5)}, ${lo.toFixed(5)}`
            onChange(la, lo, addr)
          })
          .catch(() => onChange(la, lo, `Lokasi saat ini (${la.toFixed(4)}, ${lo.toFixed(4)})`))
          .finally(() => setFinding(false))
      },
      err => {
        setFinding(false)
        setGpsErr(err.code === 1 ? 'Izin lokasi ditolak. Aktifkan di pengaturan browser atau cari alamat manual.' : 'GPS gagal. Cari alamat secara manual.')
        setMode('search')
      },
      { timeout: 10000, maximumAge: 60000 }
    )
  }

  function searchAddress(q) {
    clearTimeout(timerRef.current)
    setQuery(q)
    if (!q.trim() || q.length < 4) { setResults([]); return }
    timerRef.current = setTimeout(async () => {
      setFinding(true)
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=id&countrycodes=id`)
        const data = await r.json()
        setResults(data)
      } catch {} finally { setFinding(false) }
    }, 600)
  }

  function pickResult(r) {
    onChange(parseFloat(r.lat), parseFloat(r.lon), r.display_name)
    setResults([])
    setQuery(r.display_name)
    setMode('gps') // kembali ke tampilan ringkas
  }

  return (
    <div>
      {/* Lokasi terpilih */}
      {lat && lng && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
          borderRadius: 10, background: 'rgba(0,200,150,0.08)',
          border: '1px solid rgba(0,200,150,0.3)', marginBottom: 10,
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>📍</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: '#027A48', fontWeight: 700, marginBottom: 2 }}>Lokasi terdeteksi</div>
            <div style={{ fontSize: 12, color: 'var(--k-text)', lineHeight: 1.4, wordBreak: 'break-word' }}>{address}</div>
          </div>
          <button onClick={() => setMode('search')} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#F97316', fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>Ganti</button>
        </div>
      )}

      {/* GPS error */}
      {gpsErr && (
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)', fontSize: 12, color: '#C2410C', marginBottom: 10 }}>
          ⚠ {gpsErr}
        </div>
      )}

      {/* Tombol aksi */}
      <div style={{ display: 'flex', gap: 8, marginBottom: mode === 'search' ? 10 : 0 }}>
        {(!lat || !lng || gpsErr) && (
          <button onClick={detectGps} disabled={finding} style={{
            flex: 1, padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--k-border)',
            background: 'var(--k-input)', color: finding ? 'var(--k-sub)' : 'var(--k-text)',
            cursor: finding ? 'default' : 'pointer', fontSize: 12, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {finding ? <><div style={{ width: 12, height: 12, border: '2px solid #F97316', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Mendeteksi...</> : '📍 Gunakan GPS'}
          </button>
        )}
        <button onClick={() => setMode(m => m === 'search' ? 'gps' : 'search')} style={{
          flex: lat && lng ? 0 : 1, padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--k-border)',
          background: mode === 'search' ? 'rgba(249,115,22,0.1)' : 'var(--k-input)',
          color: mode === 'search' ? '#F97316' : 'var(--k-text)',
          cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
        }}>🔍 Cari Alamat</button>
      </div>

      {/* Search box */}
      {mode === 'search' && (
        <div>
          <input
            type="text" value={query} onChange={e => searchAddress(e.target.value)}
            placeholder="Ketik nama jalan, desa, kecamatan..."
            autoFocus
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, boxSizing: 'border-box',
              border: '1.5px solid #F97316', background: 'var(--k-input)', color: 'var(--k-text)', outline: 'none',
            }}
          />
          {finding && <div style={{ fontSize: 12, color: 'var(--k-sub)', marginTop: 6, padding: '0 4px' }}>Mencari...</div>}
          {results.length > 0 && (
            <div style={{ border: '1px solid var(--k-border)', borderRadius: 10, overflow: 'hidden', marginTop: 4 }}>
              {results.map(r => (
                <div key={r.place_id} onClick={() => pickResult(r)} style={{
                  padding: '10px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--k-text)',
                  borderBottom: '1px solid var(--k-border)', background: 'var(--k-card)',
                  lineHeight: 1.4,
                }}>
                  📍 {r.display_name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Halaman keranjang ─────────────────────────────────────────────────────────
export default function FoodCartPage() {
  const { state }  = useLocation()
  const navigate   = useNavigate()
  const { merchant, cart } = state || {}

  const [address,         setAddress]         = useState('')
  const [lat,             setLat]             = useState(null)
  const [lng,             setLng]             = useState(null)
  const [payMethod,       setPayMethod]       = useState('wallet')
  const [notes,           setNotes]           = useState('')
  const [estimate,        setEstimate]        = useState(null)
  const [loadingEst,      setLoadingEst]      = useState(false)
  const [submitting,      setSubmitting]      = useState(false)
  const [err,             setErr]             = useState('')
  const [deliveryMode,    setDeliveryMode]    = useState('regular')
  const [sessions,        setSessions]        = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  const [loadingSessions, setLoadingSessions] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => { if (!merchant || !cart?.length) navigate('/food') }, []) // eslint-disable-line
  useEffect(() => { return () => clearTimeout(timerRef.current) }, [])

  // Hitung estimasi ongkir
  useEffect(() => {
    if (!lat || !lng || !merchant?.id) return
    setLoadingEst(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      api.get('/food/delivery-estimate', { params: { merchant_id: merchant.id, delivery_lat: lat, delivery_lng: lng } })
        .then(r => setEstimate(r.data))
        .catch(() => {})
        .finally(() => setLoadingEst(false))
    }, 600)
  }, [lat, lng, merchant?.id])

  // Fetch sesi hemat ongkir
  useEffect(() => {
    if (!lat || !lng) return
    setLoadingSessions(true)
    api.get('/food/jastip/sessions/available', { params: { lat, lng } })
      .then(r => setSessions(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoadingSessions(false))
  }, [lat, lng])

  if (!merchant || !cart?.length) return null

  const subtotal    = cart.reduce((s, l) => s + l.item.price * l.quantity, 0)
  const deliveryFee = estimate?.delivery_fee ?? 0
  const total       = subtotal + deliveryFee

  async function handleOrder() {
    if (!address.trim())  { setErr('Masukkan alamat pengiriman.'); return }
    if (!lat || !lng)     { setErr('Lokasi pengiriman belum terdeteksi.'); return }
    if (deliveryMode === 'jastip' && !selectedSession) { setErr('Pilih sesi hemat ongkir.'); return }
    setErr(''); setSubmitting(true)
    try {
      const res = await api.post('/food/orders', {
        merchant_id:      merchant.id,
        items:            cart.map(l => ({ menu_item_id: l.menu_item_id, quantity: l.quantity, notes: l.notes })),
        delivery_address: address,
        delivery_lat:     lat,
        delivery_lng:     lng,
        delivery_fee:     deliveryFee,
        payment_method:   payMethod,
        notes,
      })
      const orderId = res.data.data.id
      if (deliveryMode === 'jastip' && selectedSession) {
        try { await api.post(`/food/jastip/sessions/${selectedSession.id}/join`, { food_order_id: orderId }) }
        catch {}
      }
      navigate(`/food/orders/${orderId}`, { replace: true })
    } catch (e) { setErr(e.response?.data?.message || 'Gagal membuat order.') }
    finally { setSubmitting(false) }
  }

  const card = { padding: '16px', borderRadius: 14, background: 'var(--k-card)', border: '1.5px solid var(--k-border)', marginBottom: 12 }
  const isReady = !submitting && !loadingEst && estimate && address.trim() && lat && lng
    && (deliveryMode === 'regular' || (deliveryMode === 'jastip' && selectedSession))

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', paddingBottom: 100 }}>

      {/* Header */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--k-card)', borderBottom: '1px solid var(--k-border)', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--k-text)' }}>‹</button>
        <div style={{ fontWeight: 800, fontSize: 17 }}>Keranjang</div>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--k-sub)' }}>{merchant.name}</div>
      </div>

      <div style={{ padding: '14px', maxWidth: 520, margin: '0 auto' }}>

        {err && (
          <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(245,101,101,0.1)', color: '#DC2626', fontSize: 13, marginBottom: 12, fontWeight: 600 }}>
            ⚠ {err}
          </div>
        )}

        {/* ── Daftar item pesanan ── */}
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Pesanan</div>
          {cart.map(l => (
            <div key={l.menu_item_id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span>
                  <span style={{ fontWeight: 600 }}>{l.item.name}</span>
                  <span style={{ color: 'var(--k-sub)', fontSize: 13 }}> ×{l.quantity}</span>
                </span>
                <span style={{ fontWeight: 700 }}>{fmtRp(l.item.price * l.quantity)}</span>
              </div>
              {l.notes && <div style={{ fontSize: 11, color: 'var(--k-sub)', marginTop: 2, fontStyle: 'italic' }}>📝 {l.notes}</div>}
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--k-border)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--k-sub)' }}>
            <span>Subtotal</span><span style={{ fontWeight: 700, color: 'var(--k-text)' }}>{fmtRp(subtotal)}</span>
          </div>
        </div>

        {/* ── Lokasi pengiriman ── */}
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>📍 Lokasi Pengiriman</div>
          <LocationPicker
            lat={lat} lng={lng} address={address}
            onChange={(la, lo, addr) => { setLat(la); setLng(lo); setAddress(addr) }}
          />
          {lat && lng && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--k-sub)', marginBottom: 6 }}>Nama/detail alamat</div>
              <textarea rows={2} value={address} onChange={e => setAddress(e.target.value)}
                placeholder="cth: Rumah depan warung Bu Sri, RT 04..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, boxSizing: 'border-box', border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', resize: 'none' }}
              />
            </div>
          )}
        </div>

        {/* ── Cara pengiriman ── */}
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Cara Pengiriman</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: deliveryMode === 'jastip' ? 14 : 0 }}>
            <button onClick={() => { setDeliveryMode('regular'); setSelectedSession(null) }} style={{
              flex: 1, padding: '12px 8px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
              border: `2px solid ${deliveryMode === 'regular' ? '#F97316' : 'var(--k-border)'}`,
              background: deliveryMode === 'regular' ? 'rgba(249,115,22,0.08)' : 'transparent',
            }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>🚗</div>
              <div style={{ fontSize: 12, fontWeight: deliveryMode === 'regular' ? 700 : 400, color: deliveryMode === 'regular' ? '#F97316' : 'var(--k-sub)' }}>Kirim Reguler</div>
              <div style={{ fontSize: 11, color: 'var(--k-sub)' }}>Mitra khusus</div>
            </button>
            <button onClick={() => setDeliveryMode('jastip')} style={{
              flex: 1, padding: '12px 8px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
              border: `2px solid ${deliveryMode === 'jastip' ? '#F97316' : 'var(--k-border)'}`,
              background: deliveryMode === 'jastip' ? 'rgba(249,115,22,0.08)' : 'transparent',
              position: 'relative',
            }}>
              {sessions.length > 0 && (
                <span style={{ position: 'absolute', top: -8, right: -8, background: '#F97316', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '2px 7px' }}>{sessions.length}</span>
              )}
              <div style={{ fontSize: 22, marginBottom: 4 }}>🛵</div>
              <div style={{ fontSize: 12, fontWeight: deliveryMode === 'jastip' ? 700 : 400, color: deliveryMode === 'jastip' ? '#F97316' : 'var(--k-sub)' }}>Hemat Ongkir</div>
              <div style={{ fontSize: 11, color: 'var(--k-sub)' }}>Gabung sesi mitra</div>
            </button>
          </div>

          {deliveryMode === 'jastip' && (
            loadingSessions ? (
              <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 13, color: 'var(--k-sub)' }}>Mencari sesi aktif...</div>
            ) : sessions.length === 0 ? (
              <div style={{ padding: '12px', borderRadius: 10, background: 'rgba(246,173,85,0.1)', color: '#F59E0B', fontSize: 13, textAlign: 'center' }}>
                😕 Belum ada sesi di sekitarmu. Coba kirim reguler.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--k-sub)' }}>Pilih sesi mitra:</div>
                {sessions.map(s => (
                  <div key={s.id} onClick={() => setSelectedSession(s)} style={{
                    padding: '12px', borderRadius: 10, cursor: 'pointer',
                    border: `2px solid ${selectedSession?.id === s.id ? '#F97316' : 'var(--k-border)'}`,
                    background: selectedSession?.id === s.id ? 'rgba(249,115,22,0.06)' : 'var(--k-input)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{s.vehicle_type === 'motor' ? '🛵' : '🚗'} {s.mitra?.name || 'Mitra'}</div>
                        <div style={{ fontSize: 11, color: 'var(--k-sub)', marginTop: 3 }}>{s.origin_address || '—'} → {s.destination_address || '...'}</div>
                        <div style={{ fontSize: 11, color: 'var(--k-sub)' }}>{s.orders_count}/{s.max_orders} slot</div>
                      </div>
                      {selectedSession?.id === s.id && <span style={{ color: '#F97316', fontSize: 18, fontWeight: 700 }}>✓</span>}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* ── Metode bayar ── */}
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Metode Pembayaran</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[['wallet','💳','Saldo ZasaQu'],['cod','💵','Bayar di Tempat']].map(([v,e,l]) => (
              <button key={v} onClick={() => setPayMethod(v)} style={{
                flex: 1, padding: '12px 8px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                border: `2px solid ${payMethod === v ? '#F97316' : 'var(--k-border)'}`,
                background: payMethod === v ? 'rgba(249,115,22,0.08)' : 'transparent',
              }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{e}</div>
                <div style={{ fontSize: 12, fontWeight: payMethod === v ? 700 : 400, color: payMethod === v ? '#F97316' : 'var(--k-sub)' }}>{l}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Catatan global ── */}
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Catatan Tambahan</div>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Catatan umum untuk merchant..."
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, boxSizing: 'border-box', border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', resize: 'none' }}
          />
        </div>

        {/* ── Ringkasan pembayaran ── */}
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Ringkasan Pembayaran</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: 'var(--k-sub)' }}>Subtotal</span>
            <span style={{ fontWeight: 600 }}>{fmtRp(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: 'var(--k-sub)' }}>Ongkos kirim</span>
            <span style={{ fontWeight: 600 }}>
              {loadingEst ? <span style={{ color: '#F59E0B' }}>Menghitung...</span> : estimate ? fmtRp(deliveryFee) : <span style={{ color: '#9CA3AF' }}>—</span>}
            </span>
          </div>
          {estimate?.estimated_minutes && (
            <div style={{ fontSize: 12, color: '#027A48', fontWeight: 600, marginBottom: 6 }}>
              ⏱ Estimasi tiba ~{estimate.estimated_minutes} menit
            </div>
          )}
          {estimate && (
            <>
              <div style={{ borderTop: '1px solid var(--k-border)', margin: '10px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16 }}>
                <span>Total</span><span style={{ color: '#F97316' }}>{fmtRp(total)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── CTA Pesan ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 520, padding: '10px 14px 14px', boxSizing: 'border-box',
        background: 'var(--k-card)', borderTop: '1px solid var(--k-border)',
      }}>
        {!lat && (
          <div style={{ fontSize: 12, color: '#F59E0B', textAlign: 'center', marginBottom: 6 }}>
            ⚠ Tentukan lokasi pengiriman terlebih dahulu
          </div>
        )}
        <button onClick={handleOrder} disabled={!isReady} style={{
          width: '100%', padding: '14px', borderRadius: 14, border: 'none',
          background: isReady ? '#F97316' : 'var(--k-border)',
          color: '#fff', fontWeight: 700, fontSize: 15,
          cursor: isReady ? 'pointer' : 'default', transition: 'background 0.2s',
        }}>
          {submitting ? 'Memproses...'
            : !lat || !lng ? 'Tentukan lokasi dulu'
            : !estimate ? 'Menghitung ongkir...'
            : deliveryMode === 'jastip' && !selectedSession ? 'Pilih sesi hemat ongkir'
            : `Pesan Sekarang · ${fmtRp(total)}`}
        </button>
      </div>
    </div>
  )
}
