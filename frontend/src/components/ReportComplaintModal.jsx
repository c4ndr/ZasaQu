import { useState } from 'react'
import api from '../services/api'

const REASONS = [
  { key: 'rusak',        label: 'Barang/hasil rusak' },
  { key: 'tidak_sesuai',  label: 'Tidak sesuai pesanan' },
  { key: 'kualitas_buruk', label: 'Kualitas buruk' },
  { key: 'terlambat',    label: 'Terlambat signifikan' },
  { key: 'lainnya',      label: 'Lainnya' },
]

/**
 * Modal "Laporkan Masalah" — dipakai di semua halaman detail order pelanggan
 * (ZasaGo/Food/Mart/Home/Serv/Ride) untuk order yang sudah completed.
 * Props: orderType, orderId, onClose, onSuccess
 */
export default function ReportComplaintModal({ orderType, orderId, onClose, onSuccess }) {
  const [reason, setReason]           = useState('')
  const [description, setDescription] = useState('')
  const [photo, setPhoto]             = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState('')

  const handlePhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    if (!reason) { setError('Pilih jenis masalah terlebih dahulu.'); return }
    setSubmitting(true)
    setError('')
    try {
      const form = new FormData()
      form.append('order_type', orderType)
      form.append('order_id', orderId)
      form.append('reason', REASONS.find(r => r.key === reason)?.label ?? reason)
      if (description) form.append('description', description)
      if (photo) form.append('photo', photo)

      await api.post('/complaints', form)
      onSuccess?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengirim laporan.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 480, background: 'var(--k-card)', borderRadius: '24px 24px 0 0',
        padding: '20px 20px 28px', maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--k-border)', margin: '0 auto 16px' }} />

        <h2 style={{ fontSize: 17, fontWeight: 900, color: 'var(--k-text)', marginBottom: 4 }}>Laporkan Masalah</h2>
        <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 18 }}>
          Ceritakan apa yang terjadi — tim kami akan meninjau dan menghubungimu.
        </p>

        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-sub)', marginBottom: 8 }}>Jenis Masalah</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {REASONS.map(r => (
            <button key={r.key} onClick={() => setReason(r.key)} style={{
              padding: '8px 14px', borderRadius: 100, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              border: reason === r.key ? '1.5px solid var(--k-accent)' : '1px solid var(--k-border)',
              background: reason === r.key ? 'rgba(0,200,150,0.1)' : 'transparent',
              color: reason === r.key ? 'var(--k-accent)' : 'var(--k-sub)',
            }}>
              {r.label}
            </button>
          ))}
        </div>

        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-sub)', marginBottom: 8 }}>Detail (opsional)</p>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Jelaskan masalah yang kamu alami..."
          rows={4}
          className="input-field"
          style={{ width: '100%', padding: '12px 14px', fontSize: 13, marginBottom: 16, resize: 'none' }}
        />

        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-sub)', marginBottom: 8 }}>Foto Bukti (opsional)</p>
        {photoPreview ? (
          <div style={{ position: 'relative', width: 100, marginBottom: 16 }}>
            <img src={photoPreview} alt="Preview" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--k-border)' }} />
            <button onClick={() => { setPhoto(null); setPhotoPreview(null) }} style={{
              position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%',
              border: 'none', background: 'var(--k-danger)', color: '#fff', fontSize: 12, cursor: 'pointer',
            }}>✕</button>
          </div>
        ) : (
          <label style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', width: 100, height: 100,
            borderRadius: 12, border: '1.5px dashed var(--k-border)', color: 'var(--k-muted)',
            fontSize: 24, cursor: 'pointer', marginBottom: 16,
          }}>
            📷
            <input type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
          </label>
        )}

        {error && (
          <p style={{ fontSize: 12, color: 'var(--k-danger)', background: 'rgba(245,101,101,0.08)', borderRadius: 10, padding: '8px 12px', marginBottom: 16 }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: 13, borderRadius: 14, border: '1px solid var(--k-border)',
            background: 'transparent', color: 'var(--k-sub)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>
            Batal
          </button>
          <button onClick={handleSubmit} disabled={!reason || submitting} style={{
            flex: 2, padding: 13, borderRadius: 14, border: 'none',
            background: 'var(--k-accent)', color: '#0C0C16', fontWeight: 800, fontSize: 14,
            cursor: (!reason || submitting) ? 'default' : 'pointer', opacity: (!reason || submitting) ? 0.5 : 1,
          }}>
            {submitting ? 'Mengirim...' : 'Kirim Laporan'}
          </button>
        </div>
      </div>
    </div>
  )
}
