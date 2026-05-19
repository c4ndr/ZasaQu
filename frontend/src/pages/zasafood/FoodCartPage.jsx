import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../../services/api'

function fmtRp(v) { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }

export default function FoodCartPage() {
  const { state }  = useLocation()
  const navigate   = useNavigate()
  const { merchant, cart } = state || {}

  const [address,      setAddress]      = useState('')
  const [lat,          setLat]          = useState(null)
  const [lng,          setLng]          = useState(null)
  const [payMethod,    setPayMethod]    = useState('wallet')
  const [notes,        setNotes]        = useState('')
  const [estimate,     setEstimate]     = useState(null)
  const [loadingEst,   setLoadingEst]   = useState(false)
  const [gpsLoading,   setGpsLoading]   = useState(true)
  const [submitting,   setSubmitting]   = useState(false)
  const [err,          setErr]          = useState('')
  const [gpsErr,       setGpsErr]       = useState('')
  const [manualLat,    setManualLat]    = useState('')
  const [manualLng,    setManualLng]    = useState('')
  const timerRef = useRef(null)

  useEffect(() => {
    if (!merchant || !cart?.length) navigate('/food')
  }, [])

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  // Coba dapatkan lokasi user otomatis
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsLoading(false)
      setGpsErr('Browser tidak mendukung GPS. Masukkan koordinat secara manual.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
        setAddress('Lokasi saat ini (koordinat terdeteksi)')
        setGpsErr('')
        setGpsLoading(false)
      },
      () => {
        setGpsLoading(false)
        setGpsErr('Izin GPS ditolak. Masukkan koordinat secara manual.')
      }
    )
  }, [])

  // Hitung estimasi ongkir saat lat/lng tersedia
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

  if (!merchant || !cart?.length) return null

  const subtotal    = cart.reduce((s, l) => s + l.item.price * l.quantity, 0)
  const deliveryFee = estimate?.delivery_fee ?? 0
  const total       = subtotal + deliveryFee

  async function handleOrder() {
    if (!address.trim()) { setErr('Masukkan alamat pengiriman.'); return }
    if (!lat || !lng)    { setErr('Lokasi pengiriman belum terdeteksi.'); return }
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
      navigate(`/food/orders/${res.data.data.id}`, { replace: true })
    } catch (e) {
      setErr(e.response?.data?.message || 'Gagal membuat order.')
    } finally { setSubmitting(false) }
  }

  const inp = {
    width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14, boxSizing: 'border-box',
    border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)',
  }
  const card = { padding: '18px', borderRadius: 14, background: 'var(--k-card)', border: '1.5px solid var(--k-border)', marginBottom: 14 }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--k-card)', borderBottom: '1px solid var(--k-border)' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--k-text)' }}>‹</button>
        <div style={{ fontWeight: 800, fontSize: 17 }}>Keranjang</div>
      </div>

      <div style={{ padding: '16px', maxWidth: 520, margin: '0 auto' }}>
        {err && (
          <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(245,101,101,0.1)', color: '#F56565', fontSize: 13, marginBottom: 14 }}>{err}</div>
        )}

        {/* Merchant info */}
        <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🏪</span>
          <div>
            <div style={{ fontWeight: 700 }}>{merchant.name}</div>
            <div style={{ fontSize: 12, color: 'var(--k-sub)' }}>Pesanan dari {cart.length} item</div>
          </div>
        </div>

        {/* Daftar item */}
        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Pesanan</div>
          {cart.map(l => (
            <div key={l.menu_item_id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
              <div>
                <span style={{ fontWeight: 600 }}>{l.item.name}</span>
                <span style={{ color: 'var(--k-sub)' }}> ×{l.quantity}</span>
              </div>
              <span style={{ fontWeight: 700 }}>{fmtRp(l.item.price * l.quantity)}</span>
            </div>
          ))}
        </div>

        {/* Alamat pengiriman */}
        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Alamat Pengiriman</div>
          <textarea
            rows={2} value={address} onChange={e => setAddress(e.target.value)}
            placeholder="Tulis alamat lengkap pengiriman..."
            style={{ ...inp, resize: 'vertical', marginBottom: 10 }}
          />
          <div style={{ fontSize: 12, marginBottom: 8, color: lat && lng ? '#00C896' : gpsLoading ? '#F6AD55' : 'var(--k-sub)' }}>
            {gpsLoading
              ? '⏳ Mendeteksi lokasi GPS...'
              : lat && lng
                ? `✓ Koordinat: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
                : '⚠ Koordinat belum terdeteksi'}
          </div>
          <button onClick={() => {
            setGpsLoading(true)
            setGpsErr('')
            navigator.geolocation?.getCurrentPosition(
              pos => {
                setLat(pos.coords.latitude)
                setLng(pos.coords.longitude)
                setAddress('Lokasi saat ini')
                setGpsErr('')
                setGpsLoading(false)
              },
              () => {
                setGpsLoading(false)
                setGpsErr('GPS gagal. Pastikan izin lokasi diaktifkan di browser.')
              }
            )
          }} disabled={gpsLoading} style={{
            padding: '8px 14px', borderRadius: 10, border: '1.5px solid var(--k-border)',
            background: 'transparent', color: gpsLoading ? 'var(--k-border)' : 'var(--k-sub)',
            cursor: gpsLoading ? 'default' : 'pointer', fontSize: 12,
          }}>{gpsLoading ? '⏳ Mendeteksi lokasi...' : '📍 Gunakan Lokasi Saat Ini'}</button>

          {gpsErr && (
            <div style={{ marginTop: 10 }}>
              <div style={{
                padding: '10px 12px', borderRadius: 10, fontSize: 12,
                background: 'rgba(245,101,101,0.1)', color: '#F56565', marginBottom: 10,
              }}>{gpsErr}</div>
              <div style={{ fontSize: 12, color: 'var(--k-sub)', marginBottom: 6 }}>Masukkan koordinat secara manual:</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="number" step="any" placeholder="Latitude (mis. -6.2146)"
                  value={manualLat}
                  onChange={e => {
                    setManualLat(e.target.value)
                    const v = parseFloat(e.target.value)
                    if (!isNaN(v) && v >= -90 && v <= 90) setLat(v)
                  }}
                  style={{ ...inp, flex: 1, fontSize: 12 }}
                />
                <input
                  type="number" step="any" placeholder="Longitude (mis. 106.8451)"
                  value={manualLng}
                  onChange={e => {
                    setManualLng(e.target.value)
                    const v = parseFloat(e.target.value)
                    if (!isNaN(v) && v >= -180 && v <= 180) setLng(v)
                  }}
                  style={{ ...inp, flex: 1, fontSize: 12 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Catatan */}
        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Catatan untuk Merchant</div>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Contoh: tidak pedas, tanpa bawang..." style={{ ...inp, resize: 'vertical' }} />
        </div>

        {/* Metode bayar */}
        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Metode Pembayaran</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[['wallet','Dompet ZasaQu','💳'], ['cod','Bayar di Tempat','💵']].map(([v, l, e]) => (
              <button key={v} onClick={() => setPayMethod(v)} style={{
                flex: 1, padding: '12px 8px', borderRadius: 12, cursor: 'pointer',
                border: `2px solid ${payMethod === v ? '#FF7A45' : 'var(--k-border)'}`,
                background: payMethod === v ? 'rgba(255,122,69,0.08)' : 'transparent',
                color: payMethod === v ? '#FF7A45' : 'var(--k-sub)', fontWeight: payMethod === v ? 700 : 400,
                fontSize: 12, textAlign: 'center',
              }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{e}</div>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Ringkasan harga */}
        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Ringkasan Pembayaran</div>
          {[
            ['Subtotal', fmtRp(subtotal)],
            ['Ongkir', loadingEst ? 'Menghitung...' : estimate ? fmtRp(deliveryFee) : 'Masukkan alamat'],
            estimate ? [`Estimasi tiba ~${estimate.estimated_minutes} menit`, ''] : null,
          ].filter(Boolean).map(([l, v]) => v && (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: 'var(--k-sub)' }}>{l}</span>
              <span style={{ fontWeight: 600 }}>{v}</span>
            </div>
          ))}
          {estimate && (
            <>
              <div style={{ borderTop: '1px solid var(--k-border)', margin: '10px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15 }}>
                <span>Total</span><span style={{ color: '#FF7A45' }}>{fmtRp(total)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* CTA */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, padding: '12px 16px', boxSizing: 'border-box',
        background: 'var(--k-card)', borderTop: '1px solid var(--k-border)',
      }}>
        {(() => {
          const isReady = !submitting && !gpsLoading && !loadingEst && estimate && address.trim() && lat && lng
          const label = submitting       ? 'Memproses...'
                      : gpsLoading      ? 'Mendeteksi lokasi GPS...'
                      : !lat || !lng    ? 'Lokasi belum terdeteksi'
                      : !address.trim() ? 'Isi alamat pengiriman'
                      : loadingEst      ? 'Menghitung ongkir...'
                      : !estimate       ? 'Menghitung ongkir...'
                      : `Pesan Sekarang · ${fmtRp(total)}`
          return (
            <button onClick={handleOrder} disabled={!isReady} style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none',
              background: isReady ? '#FF7A45' : 'var(--k-border)',
              color: '#fff', fontWeight: 700, fontSize: 15,
              cursor: isReady ? 'pointer' : 'default',
              transition: 'background 0.2s',
            }}>{label}</button>
          )
        })()}
      </div>
    </div>
  )
}
