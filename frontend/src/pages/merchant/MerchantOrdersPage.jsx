import MerchantLayout from '../../components/MerchantLayout'

export default function MerchantOrdersPage() {
  return (
    <MerchantLayout title="Order Masuk">
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '60px 0', color: 'var(--k-sub)', textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🛎️</div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Halaman Order Masuk</div>
        <div style={{ fontSize: 14 }}>Akan diimplementasi di Sprint 3 (Order Flow).</div>
      </div>
    </MerchantLayout>
  )
}
