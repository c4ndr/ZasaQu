import { useState } from 'react'
import api from '../services/api'

const fmt = (n) => new Intl.NumberFormat('id-ID').format(n)

/**
 * Props:
 *   orderAmount   - number: total order untuk menghitung diskon
 *   module        - string: 'zasago' | 'zasafood' | 'zasamart' | 'zasaride'
 *   onApply       - fn({ promoCode, discountAmount }) dipanggil saat promo valid
 *   onClear       - fn() dipanggil saat promo dihapus
 */
export default function VoucherInput({ orderAmount, module, onApply, onClear }) {
  const [code,      setCode]      = useState('')
  const [info,      setInfo]      = useState(null)
  const [err,       setErr]       = useState(null)
  const [loading,   setLoading]   = useState(false)

  const handleValidate = async () => {
    if (!code.trim()) return
    setLoading(true); setErr(null); setInfo(null)
    try {
      const res = await api.post('/promos/validate', {
        code:         code.trim().toUpperCase(),
        order_amount: orderAmount,
        module,
      })
      setInfo(res.data)
      onApply?.({ promoCode: code.trim().toUpperCase(), discountAmount: res.data.discount_amount })
    } catch (e) {
      setErr(e.response?.data?.message || 'Kode promo tidak valid.')
    } finally { setLoading(false) }
  }

  const handleClear = () => {
    setCode(''); setInfo(null); setErr(null)
    onClear?.()
  }

  return (
    <div style={{ marginBottom: info ? 0 : 4 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Kode Promo (Opsional)
      </p>

      {info ? (
        <div style={{
          background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.3)',
          borderRadius: 14, padding: '12px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-accent)' }}>✅ {info.title}</p>
            <p style={{ fontSize: 12, color: 'var(--k-muted)', marginTop: 2 }}>
              Diskon Rp {fmt(info.discount_amount)} · Kode: {code.toUpperCase()}
            </p>
          </div>
          <button type="button" onClick={handleClear} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#EF4444', fontSize: 13, fontWeight: 700, padding: '4px 8px',
          }}>✕</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setErr(null) }}
              onKeyDown={e => e.key === 'Enter' && handleValidate()}
              placeholder="Masukkan kode promo"
              style={{
                flex: 1, background: 'var(--k-card)', color: 'var(--k-text)',
                border: `1.5px solid ${err ? '#EF4444' : 'var(--k-border)'}`,
                borderRadius: 14, padding: '12px 14px', fontSize: 13,
                outline: 'none', fontFamily: 'inherit',
              }}
            />
            <button
              type="button"
              onClick={handleValidate}
              disabled={loading || !code.trim()}
              style={{
                padding: '12px 18px', borderRadius: 14, fontWeight: 700, fontSize: 13,
                background: 'var(--k-accent)', color: '#0C0C16', border: 'none',
                cursor: code.trim() ? 'pointer' : 'not-allowed',
                opacity: loading || !code.trim() ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {loading ? '...' : 'Pakai'}
            </button>
          </div>
          {err && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 6 }}>{err}</p>}
        </>
      )}
    </div>
  )
}
