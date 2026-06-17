import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useAppInfo from '../../hooks/useAppInfo'
import api from '../../services/api'
import AddressPicker from '../../components/AddressPicker'
import VoucherInput from '../../components/VoucherInput'

function fmtRp(v) { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }

// ── Halaman keranjang ─────────────────────────────────────────────────────────
export default function FoodCartPage() {
  const { state }  = useLocation()
  const navigate   = useNavigate()
  const { wallet_enabled: walletEnabled } = useAppInfo()
  const { merchant, cart, preSelectedSession } = state || {}

  const [deliveryInfo,    setDeliveryInfo]    = useState(null) // { address, lat, lng, recipient_name, recipient_phone, notes }
  const [payMethod,       setPayMethod]       = useState('cod')
  const [notes,           setNotes]           = useState('')
  const [estimate,        setEstimate]        = useState(null)
  const [loadingEst,      setLoadingEst]      = useState(false)
  const [submitting,      setSubmitting]      = useState(false)
  const [err,             setErr]             = useState('')
  const [deliveryMode,    setDeliveryMode]    = useState(preSelectedSession ? 'jastip' : 'regular')
  const [sessions,        setSessions]        = useState([])
  const [selectedSession, setSelectedSession] = useState(preSelectedSession ?? null)
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [promo,           setPromo]           = useState({ promoCode: null, discountAmount: 0 })
  const timerRef = useRef(null)

  useEffect(() => { if (!merchant || !cart?.length) navigate('/food') }, []) // eslint-disable-line
  useEffect(() => { return () => clearTimeout(timerRef.current) }, [])

  // Hitung estimasi ongkir
  useEffect(() => {
    if (!deliveryInfo?.lat || !deliveryInfo?.lng || !merchant?.id) return
    setLoadingEst(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      api.get('/food/delivery-estimate', { params: { merchant_id: merchant.id, delivery_lat: deliveryInfo.lat, delivery_lng: deliveryInfo.lng } })
        .then(r => setEstimate(r.data))
        .catch(() => { setEstimate({ delivery_fee: 0, error: true }) })
        .finally(() => setLoadingEst(false))
    }, 600)
  }, [deliveryInfo?.lat, deliveryInfo?.lng, merchant?.id])

  // Fetch sesi hemat ongkir — filter by merchant agar hanya yang koridor-nya cocok
  useEffect(() => {
    if (!merchant?.id) return
    setLoadingSessions(true)
    const params = { merchant_id: merchant.id }
    if (deliveryInfo?.lat) params.lat = deliveryInfo.lat
    if (deliveryInfo?.lng) params.lng = deliveryInfo.lng
    api.get('/food/jastip/sessions/available', { params })
      .then(r => setSessions(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoadingSessions(false))
  }, [merchant?.id, deliveryInfo?.lat, deliveryInfo?.lng])

  if (!merchant || !cart?.length) return null

  const subtotal    = cart.reduce((s, l) => s + l.item.price * l.quantity, 0)
  const deliveryFee = estimate?.delivery_fee ?? 0
  const total       = Math.max(0, subtotal + deliveryFee - promo.discountAmount)

  async function handleOrder() {
    if (!deliveryInfo?.address?.trim()) { setErr('Pilih alamat pengiriman terlebih dahulu.'); return }
    if (!deliveryInfo?.lat || !deliveryInfo?.lng) { setErr('Lokasi pengiriman belum terdeteksi.'); return }
    if (deliveryMode === 'jastip' && !selectedSession) { setErr('Pilih sesi hemat ongkir.'); return }
    setErr(''); setSubmitting(true)
    try {
      const res = await api.post('/food/orders', {
        merchant_id:      merchant.id,
        items:            cart.map(l => ({ menu_item_id: l.menu_item_id, quantity: l.quantity, notes: l.notes })),
        delivery_address: deliveryInfo.address,
        delivery_lat:     deliveryInfo.lat,
        delivery_lng:     deliveryInfo.lng,
        delivery_fee:     deliveryFee,
        payment_method:   payMethod,
        notes,
        ...(promo.promoCode ? { promo_code: promo.promoCode } : {}),
      })
      const orderId = res.data.data.id
      if (deliveryMode === 'jastip' && selectedSession) {
        try {
          await api.post(`/food/jastip/sessions/${selectedSession.id}/join`, { food_order_id: orderId })
        } catch (joinErr) {
          const msg = joinErr.response?.data?.message || 'Gagal bergabung ke sesi hemat ongkir.'
          setErr(`Order berhasil dibuat, tapi ${msg} Pesanan akan diproses reguler.`)
          navigate(`/food/orders/${orderId}`, { replace: true })
          return
        }
      }
      navigate(`/food/orders/${orderId}`, { replace: true })
    } catch (e) { setErr(e.response?.data?.message || 'Gagal membuat order.') }
    finally { setSubmitting(false) }
  }

  const card = { padding: '16px', borderRadius: 14, background: 'var(--k-card)', border: '1.5px solid var(--k-border)', marginBottom: 12 }
  const isReady = !submitting && !loadingEst && estimate && deliveryInfo?.address?.trim() && deliveryInfo?.lat && deliveryInfo?.lng
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
          <AddressPicker value={deliveryInfo} onChange={setDeliveryInfo} />
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
            {[['wallet','💳','Saldo ZasaQu'],['cod','💵','Bayar di Tempat']].filter(([v]) => v !== 'wallet' || walletEnabled).map(([v,e,l]) => (
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

        {/* ── Kode Promo ── */}
        <div style={card}>
          <VoucherInput
            orderAmount={subtotal + deliveryFee}
            module="zasafood"
            onApply={({ promoCode, discountAmount }) => setPromo({ promoCode, discountAmount })}
            onClear={() => setPromo({ promoCode: null, discountAmount: 0 })}
          />
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
          {promo.discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: 'var(--k-accent)' }}>Diskon Promo</span>
              <span style={{ fontWeight: 700, color: 'var(--k-accent)' }}>-{fmtRp(promo.discountAmount)}</span>
            </div>
          )}
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
        {!deliveryInfo?.lat && (
          <div style={{ fontSize: 12, color: '#F59E0B', textAlign: 'center', marginBottom: 6 }}>
            ⚠ Tentukan lokasi pengiriman terlebih dahulu
          </div>
        )}
        {estimate?.error && (
          <div style={{ fontSize: 12, color: '#F59E0B', textAlign: 'center', marginBottom: 6 }}>
            ⚠ Biaya antar tidak tersedia — hubungi merchant. Akan dilanjutkan dengan biaya Rp 0.
          </div>
        )}
        <button onClick={handleOrder} disabled={!isReady} style={{
          width: '100%', padding: '14px', borderRadius: 14, border: 'none',
          background: isReady ? '#F97316' : 'var(--k-border)',
          color: '#fff', fontWeight: 700, fontSize: 15,
          cursor: isReady ? 'pointer' : 'default', transition: 'background 0.2s',
        }}>
          {submitting ? 'Memproses...'
            : !deliveryInfo?.lat || !deliveryInfo?.lng ? 'Tentukan lokasi dulu'
            : !estimate ? 'Menghitung ongkir...'
            : deliveryMode === 'jastip' && !selectedSession ? 'Pilih sesi hemat ongkir'
            : `Pesan Sekarang · ${fmtRp(total)}${promo.discountAmount > 0 ? ' 🎟' : ''}`}
        </button>
      </div>
    </div>
  )
}
