import { useState, useEffect } from 'react'
import api from '../../services/api'

const fmt = (n) => new Intl.NumberFormat('id-ID').format(n)

const STATUS_COLOR = {
  pending:   '#F59E0B',
  accepted:  '#3B82F6',
  on_pickup: '#8B5CF6',
  on_ride:   '#00C896',
  completed: '#00C896',
  cancelled: '#EF4444',
}
const STATUS_LABEL = {
  pending:   'Menunggu',
  accepted:  'Diterima',
  on_pickup: 'Menjemput',
  on_ride:   'Dalam Perjalanan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

export default function AdminRideOrdersPage() {
  const [orders,  setOrders]  = useState([])
  const [fares,   setFares]   = useState([])
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('orders')
  const [statusFilter, setStatusFilter] = useState('')
  const [vehicleFilter, setVehicleFilter] = useState('')
  const [editFare, setEditFare] = useState(null)
  const [savingFare, setSavingFare] = useState(false)

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const params = {}
      if (statusFilter)  params.status       = statusFilter
      if (vehicleFilter) params.vehicle_type = vehicleFilter
      const [oRes, sRes] = await Promise.all([
        api.get('/admin/ride/orders', { params }),
        api.get('/admin/ride/stats'),
      ])
      setOrders(oRes.data.data || [])
      setStats(sRes.data)
    } catch {}
    setLoading(false)
  }

  const fetchFares = async () => {
    try {
      const res = await api.get('/admin/ride/fares')
      setFares(res.data)
    } catch {}
  }

  useEffect(() => { fetchOrders() }, [statusFilter, vehicleFilter]) // eslint-disable-line
  useEffect(() => { if (tab === 'fares') fetchFares() }, [tab])

  const saveFare = async () => {
    if (!editFare) return
    setSavingFare(true)
    try {
      await api.patch(`/admin/ride/fares/${editFare.id}`, editFare)
      setEditFare(null)
      fetchFares()
    } catch (e) {
      alert(e.response?.data?.message || 'Gagal menyimpan.')
    } finally { setSavingFare(false) }
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--k-text)', marginBottom: 4 }}>ZasaRide</h2>
        <p style={{ fontSize: 13, color: 'var(--k-muted)' }}>Manajemen order & tarif perjalanan</p>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Order',   value: stats.total,     color: '#3B82F6' },
            { label: 'Hari Ini',      value: stats.today,     color: '#F59E0B' },
            { label: 'Aktif',         value: stats.active,    color: '#00C896' },
            { label: 'Selesai',       value: stats.completed, color: '#00C896' },
            { label: 'Dibatalkan',    value: stats.cancelled, color: '#EF4444' },
            { label: 'Komisi',        value: `Rp ${fmt(stats.revenue)}`, color: '#8B5CF6' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--k-card)', border: '1px solid var(--k-border)',
              borderRadius: 14, padding: '14px 16px',
            }}>
              <p style={{ fontSize: 11, color: 'var(--k-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</p>
              <p style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, background: 'var(--k-card)', borderRadius: 12, padding: 4 }}>
        {[{ key: 'orders', label: 'Order' }, { key: 'fares', label: 'Tarif' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: tab === t.key ? 'var(--k-accent)' : 'transparent',
            color: tab === t.key ? '#0C0C16' : 'var(--k-muted)',
            fontWeight: 700, fontSize: 13,
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'orders' && (
        <>
          {/* Filter */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{
              background: 'var(--k-card)', color: 'var(--k-text)', border: '1px solid var(--k-border)',
              borderRadius: 10, padding: '8px 12px', fontSize: 13, cursor: 'pointer',
            }}>
              <option value="">Semua Status</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={vehicleFilter} onChange={e => setVehicleFilter(e.target.value)} style={{
              background: 'var(--k-card)', color: 'var(--k-text)', border: '1px solid var(--k-border)',
              borderRadius: 10, padding: '8px 12px', fontSize: 13, cursor: 'pointer',
            }}>
              <option value="">Semua Kendaraan</option>
              <option value="motor">Motor</option>
              <option value="mobil">Mobil</option>
            </select>
          </div>

          {/* Tabel */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--k-muted)' }}>Memuat...</div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--k-muted)' }}>Tidak ada order.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--k-border)' }}>
                    {['No. Order', 'Customer', 'Driver', 'Kend.', 'Rute', 'Jarak', 'Ongkos', 'Status', 'Tanggal'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--k-muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid var(--k-border)' }}>
                      <td style={{ padding: '12px', fontFamily: 'monospace', color: 'var(--k-muted)', whiteSpace: 'nowrap' }}>{o.order_number}</td>
                      <td style={{ padding: '12px', color: 'var(--k-text)' }}>{o.customer?.name || '-'}</td>
                      <td style={{ padding: '12px', color: 'var(--k-text)' }}>{o.mitra?.name || <span style={{ color: 'var(--k-muted)' }}>Belum</span>}</td>
                      <td style={{ padding: '12px', textTransform: 'capitalize' }}>{o.vehicle_type}</td>
                      <td style={{ padding: '12px', maxWidth: 180 }}>
                        <p style={{ fontSize: 11, color: 'var(--k-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>→ {o.destination_address}</p>
                      </td>
                      <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>{o.distance_km} km</td>
                      <td style={{ padding: '12px', fontWeight: 700, color: 'var(--k-accent)', whiteSpace: 'nowrap' }}>Rp {fmt(o.fare)}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 100,
                          color: STATUS_COLOR[o.status], background: `${STATUS_COLOR[o.status]}15`,
                          whiteSpace: 'nowrap',
                        }}>{STATUS_LABEL[o.status] || o.status}</span>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--k-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(o.created_at).toLocaleDateString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'fares' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {fares.map(fare => (
            <div key={fare.id} style={{
              background: 'var(--k-card)', border: '1px solid var(--k-border)',
              borderRadius: 16, padding: '18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{fare.vehicle_type === 'mobil' ? '🚗' : '🏍️'}</span>
                  <p style={{ fontWeight: 800, fontSize: 16, textTransform: 'capitalize' }}>{fare.vehicle_type}</p>
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 100,
                  color: fare.is_active ? '#00C896' : '#EF4444',
                  background: fare.is_active ? 'rgba(0,200,150,0.1)' : 'rgba(239,68,68,0.1)',
                }}>{fare.is_active ? 'Aktif' : 'Nonaktif'}</div>
              </div>

              {editFare?.id === fare.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { key: 'base_fare',       label: 'Tarif Dasar (Rp)' },
                    { key: 'per_km_fare',     label: 'Per Km (Rp)' },
                    { key: 'minimum_fare',    label: 'Minimum (Rp)' },
                    { key: 'commission_rate', label: 'Komisi Platform (%)' },
                    { key: 'road_factor',     label: 'Faktor Jalan (1.0–2.0)' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <p style={{ fontSize: 11, color: 'var(--k-muted)', fontWeight: 700, marginBottom: 4 }}>{label}</p>
                      <input
                        type="number"
                        value={editFare[key]}
                        onChange={e => setEditFare(prev => ({ ...prev, [key]: e.target.value }))}
                        style={{
                          width: '100%', background: 'var(--k-input)', color: 'var(--k-text)',
                          border: '1px solid var(--k-border)', borderRadius: 10, padding: '8px 12px',
                          fontSize: 14, outline: 'none', boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" checked={editFare.is_active}
                        onChange={e => setEditFare(prev => ({ ...prev, is_active: e.target.checked }))} />
                      Aktif
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setEditFare(null)} style={{
                      flex: 1, padding: '10px', borderRadius: 12,
                      background: 'var(--k-card)', border: '1px solid var(--k-border)',
                      color: 'var(--k-text)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    }}>Batal</button>
                    <button onClick={saveFare} disabled={savingFare} style={{
                      flex: 2, padding: '10px', borderRadius: 12,
                      background: 'var(--k-accent)', color: '#0C0C16',
                      border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                    }}>{savingFare ? 'Menyimpan...' : 'Simpan'}</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                    {[
                      { label: 'Tarif Dasar',    value: `Rp ${fmt(fare.base_fare)}` },
                      { label: 'Per Km',          value: `Rp ${fmt(fare.per_km_fare)}` },
                      { label: 'Minimum',         value: `Rp ${fmt(fare.minimum_fare)}` },
                      { label: 'Komisi Platform', value: `${fare.commission_rate}%` },
                      { label: 'Faktor Jalan',   value: `×${fare.road_factor}` },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: 'var(--k-muted)' }}>{label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setEditFare({ ...fare })} style={{
                    width: '100%', padding: '10px', borderRadius: 12,
                    background: 'var(--k-glow)', border: '1px solid rgba(0,200,150,0.3)',
                    color: 'var(--k-accent)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}>✏️ Edit Tarif</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
