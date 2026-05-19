export default function NewOrderBanner({ order, total, accepting, onAccept, onDismiss }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'flex-end',
      background: 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(4px)',
      animation: 'overlayIn 0.25s ease',
    }}>
      <style>{`
        @keyframes overlayIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes sheetUp    { from { transform:translateY(100%) } to { transform:translateY(0) } }
        @keyframes orderPulse { 0%,100%{box-shadow:0 0 0 0 rgba(0,200,150,0.5)} 50%{box-shadow:0 0 0 16px rgba(0,200,150,0)} }
        @keyframes spin       { to { transform:rotate(360deg) } }
      `}</style>

      <div style={{
        width: '100%', background: '#111120',
        borderRadius: '28px 28px 0 0',
        border: '1.5px solid rgba(0,200,150,0.35)', borderBottom: 'none',
        boxShadow: '0 -8px 60px rgba(0,200,150,0.2)',
        animation: 'sheetUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        padding: '8px 0 32px',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#333', margin: '8px auto 20px' }} />

        {total > 1 && (
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <span style={{ padding: '4px 14px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: 'rgba(246,173,85,0.12)', color: '#F6AD55', border: '1px solid rgba(246,173,85,0.3)' }}>
              +{total - 1} order lagi menunggu
            </span>
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: 20, padding: '0 20px' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 24, margin: '0 auto 14px',
            background: 'rgba(0,200,150,0.12)', border: '2px solid rgba(0,200,150,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, animation: 'orderPulse 2s infinite',
          }}>
            {order.vehicle_type === 'motor' ? '🏍️' : '🚗'}
          </div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#00C896', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            Order Baru Masuk!
          </p>
          <p style={{ fontSize: 22, fontWeight: 900, color: '#E8E8F2' }}>
            Rp {Number(order.shipping_fee).toLocaleString('id-ID')}
          </p>
        </div>

        <div style={{ margin: '0 16px 16px', background: '#1A1A28', border: '1px solid #252538', borderRadius: 16, padding: '14px 16px' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: order.item_description ? 10 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4, flexShrink: 0 }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#00C896' }} />
              <div style={{ width: 2, height: 20, background: '#252538', margin: '3px 0' }} />
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#F56565' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#E8E8F2', fontSize: 13, fontWeight: 600, marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {order.pickup_address}
              </p>
              <p style={{ color: '#A0A0BC', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {order.dropoff_address}
              </p>
            </div>
          </div>
          {order.item_description && (
            <p style={{ color: '#A0A0BC', fontSize: 12, marginTop: 8, paddingTop: 8, borderTop: '1px solid #252538' }}>
              📦 {order.item_description}
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px solid #252538', flexWrap: 'wrap' }}>
            <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: '#1E1E2E', color: '#A0A0BC' }}>
              {order.payment_method === 'cod' ? '💵 COD' : '💳 Wallet'}
            </span>
            {order.require_photo && (
              <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: 'rgba(246,173,85,0.1)', color: '#F6AD55', border: '1px solid rgba(246,173,85,0.25)' }}>
                📸 Wajib Foto
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, padding: '0 16px' }}>
          <button onClick={() => onDismiss(order.id)} style={{
            flex: 1, padding: '16px', borderRadius: 18, fontSize: 15, fontWeight: 700,
            background: '#1A1A28', color: '#A0A0BC', border: '1px solid #252538', cursor: 'pointer',
          }}>
            Lewati
          </button>
          <button onClick={() => onAccept(order.id)} disabled={accepting} style={{
            flex: 2, padding: '16px', borderRadius: 18, fontSize: 15, fontWeight: 800,
            background: accepting ? '#1A1A28' : '#00C896',
            color: accepting ? '#A0A0BC' : '#0C0C16',
            border: 'none', cursor: accepting ? 'not-allowed' : 'pointer',
            boxShadow: accepting ? 'none' : '0 4px 24px rgba(0,200,150,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {accepting
              ? <><span style={{ width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />Menerima...</>
              : '✅ Terima Order'}
          </button>
        </div>
      </div>
    </div>
  )
}
