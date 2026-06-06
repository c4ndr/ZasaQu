import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAddresses from '../hooks/useAddresses'
import { getPosition } from '../utils/geo'
import { reverseGeocodeGoogle } from '../utils/googleMaps'

const LABEL_EMOJI = { Rumah: '🏠', Kantor: '🏢', Lainnya: '📌' }

function getLabelEmoji(label) {
  return LABEL_EMOJI[label] ?? '📌'
}

export default function AddressPicker({ value, onChange, onGpsLoading }) {
  const navigate = useNavigate()
  const { addresses, loading } = useAddresses()
  const [open, setOpen] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)

  // Auto-select default address on mount if no value set
  useEffect(() => {
    if (!value && addresses.length > 0) {
      const def = addresses.find(a => a.is_default) ?? addresses[0]
      if (def) {
        onChange({
          address: def.address,
          lat: def.lat,
          lng: def.lng,
          recipient_name: def.recipient_name,
          recipient_phone: def.recipient_phone,
          notes: def.notes ?? '',
        })
      }
    }
  }, [addresses]) // eslint-disable-line

  function handleSelectAddress(addr) {
    onChange({
      address: addr.address,
      lat: addr.lat,
      lng: addr.lng,
      recipient_name: addr.recipient_name,
      recipient_phone: addr.recipient_phone,
      notes: addr.notes ?? '',
    })
    setOpen(false)
  }

  async function handleGps() {
    setGpsLoading(true)
    onGpsLoading?.(true)
    try {
      const { lat: la, lng: lo } = await getPosition()
      try {
        const addr = await reverseGeocodeGoogle(la, lo)
        onChange({
          address: addr,
          lat: la, lng: lo,
          recipient_name: '', recipient_phone: '', notes: '',
        })
      } catch {
        onChange({
          address: `Lokasi saat ini (${la.toFixed(4)}, ${lo.toFixed(4)})`,
          lat: la, lng: lo,
          recipient_name: '', recipient_phone: '', notes: '',
        })
      }
      setOpen(false)
    } catch {
      alert('Gagal mendapatkan lokasi GPS. Pastikan izin lokasi diaktifkan.')
    } finally {
      setGpsLoading(false)
      onGpsLoading?.(false)
    }
  }

  const truncate = (str, max = 55) => str && str.length > max ? str.slice(0, max) + '...' : str

  return (
    <>
      {/* Card tampilan alamat terpilih */}
      <div style={{
        background: 'var(--k-card)',
        border: '1px solid var(--k-border)',
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}>
        <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>📍</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {value ? (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-primary)', marginBottom: 2 }}>
                {value.recipient_name
                  ? `${value.recipient_name} · ${value.recipient_phone}`
                  : 'Lokasi dipilih'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--k-text)', lineHeight: 1.4 }}>
                {truncate(value.address)}
              </div>
            </>
          ) : loading ? (
            <div style={{ fontSize: 13, color: 'var(--k-muted)' }}>Memuat alamat...</div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--k-muted)' }}>Pilih alamat pengiriman</div>
          )}
        </div>
        <button
          onClick={() => setOpen(true)}
          style={{
            flexShrink: 0,
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid var(--k-primary)',
            background: 'none',
            color: 'var(--k-primary)',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {value ? 'Ganti' : 'Pilih'}
        </button>
      </div>

      {/* Bottom sheet overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 520,
              margin: '0 auto',
              background: 'var(--k-surface)',
              borderRadius: '20px 20px 0 0',
              maxHeight: '80dvh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 18px',
              borderBottom: '1px solid var(--k-border)',
              flexShrink: 0,
            }}>
              <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--k-text)' }}>
                Pilih Alamat Pengiriman
              </p>
              <button onClick={() => setOpen(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 20, color: 'var(--k-muted)', lineHeight: 1,
              }}>✕</button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {/* Lokasiku GPS */}
              <div
                onClick={!gpsLoading ? handleGps : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 18px',
                  borderBottom: '1px solid var(--k-border)',
                  cursor: gpsLoading ? 'default' : 'pointer',
                  opacity: gpsLoading ? 0.7 : 1,
                }}
              >
                <span style={{ fontSize: 20 }}>📍</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-primary)' }}>
                    Gunakan Lokasiku (GPS)
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>
                    {gpsLoading ? 'Mendeteksi lokasi...' : 'Gunakan posisi saat ini'}
                  </p>
                </div>
                {gpsLoading && (
                  <div style={{
                    width: 18, height: 18, border: '2px solid var(--k-primary)',
                    borderTopColor: 'transparent', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                )}
              </div>

              {/* Daftar alamat tersimpan */}
              {loading && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--k-muted)', fontSize: 13 }}>
                  Memuat alamat...
                </div>
              )}

              {!loading && addresses.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--k-muted)', fontSize: 13 }}>
                  Belum ada alamat tersimpan.
                </div>
              )}

              {addresses.map(addr => (
                <div
                  key={addr.id}
                  onClick={() => handleSelectAddress(addr)}
                  style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid var(--k-border)',
                    cursor: 'pointer',
                    background: value?.address === addr.address ? 'rgba(99,102,241,0.06)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                      background: 'rgba(99,102,241,0.12)', color: 'var(--k-primary)',
                    }}>
                      {getLabelEmoji(addr.label)} {addr.label}
                    </span>
                    {addr.is_default && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                        background: 'rgba(0,200,150,0.12)', color: 'var(--k-accent)',
                      }}>
                        Default
                      </span>
                    )}
                    {value?.address === addr.address && (
                      <span style={{ marginLeft: 'auto', color: 'var(--k-primary)', fontSize: 16 }}>✓</span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', marginBottom: 2 }}>
                    {addr.recipient_name} · {addr.recipient_phone}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--k-sub)', lineHeight: 1.4 }}>
                    {truncate(addr.address, 80)}
                  </p>
                </div>
              ))}

              {/* Tambah alamat baru */}
              <div
                onClick={() => { setOpen(false); navigate('/addresses?from=checkout') }}
                style={{
                  padding: '16px 18px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  cursor: 'pointer',
                  color: 'var(--k-primary)',
                }}
              >
                <span style={{ fontSize: 18 }}>➕</span>
                <p style={{ fontWeight: 700, fontSize: 14 }}>Tambah Alamat Baru</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
