import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const DOC_CONFIG = [
  { type: 'ktp',           label: 'KTP',           desc: 'Kartu Tanda Penduduk yang masih berlaku',       emoji: '🪪' },
  { type: 'sim',           label: 'SIM',           desc: 'Surat Izin Mengemudi sesuai kendaraan',          emoji: '🚗' },
  { type: 'stnk',          label: 'STNK',          desc: 'Surat Tanda Nomor Kendaraan yang masih berlaku', emoji: '📄' },
  { type: 'vehicle_photo', label: 'Foto Kendaraan', desc: 'Foto kendaraan tampak depan + plat nomor',      emoji: '📷' },
]

function statusColor(s) {
  return { pending: '#F6AD55', approved: '#00C896', rejected: '#F56565' }[s] ?? 'var(--k-sub)'
}
function statusLabel(s) {
  return { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' }[s] ?? '—'
}

function DocCard({ config, doc, onUpload, uploading }) {
  const fileRef   = useRef(null)
  const [prev, setPrev] = useState(null)

  function handleFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setPrev(URL.createObjectURL(f))
    onUpload(config.type, f)
  }

  const isRejected  = doc?.status === 'rejected'
  const isApproved  = doc?.status === 'approved'
  const isPending   = doc?.status === 'pending'
  const isUploading = uploading === config.type

  return (
    <div style={{
      borderRadius: 16, background: 'var(--k-card)',
      border: `1.5px solid ${isRejected ? '#F56565' : isApproved ? '#00C896' : 'var(--k-border)'}`,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '16px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, flexShrink: 0,
          background: 'var(--k-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
        }}>{config.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{config.label}</div>
          <div style={{ fontSize: 12, color: 'var(--k-sub)', marginTop: 2 }}>{config.desc}</div>
          {doc?.status && (
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                color: statusColor(doc.status), background: `${statusColor(doc.status)}22`,
              }}>{statusLabel(doc.status)}</span>
            </div>
          )}
          {isRejected && doc?.rejection_reason && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#F56565', background: 'rgba(245,101,101,0.08)', padding: '6px 10px', borderRadius: 8 }}>
              {doc.rejection_reason}
            </div>
          )}
        </div>
      </div>

      {/* Preview foto yang sudah diupload */}
      {(prev || doc?.file_path) && !isApproved && (
        <div style={{ padding: '0 16px', marginBottom: 12 }}>
          <img
            src={prev || `/storage/${doc.file_path}`}
            alt={config.label}
            style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 10 }}
          />
        </div>
      )}

      {/* Tombol upload */}
      {!isApproved && (
        <div style={{ padding: '0 16px 16px' }}>
          <label style={{ display: 'block' }}>
            <div style={{
              width: '100%', padding: '10px', borderRadius: 10, textAlign: 'center',
              border: `1.5px dashed ${isRejected ? '#F56565' : 'var(--k-border)'}`,
              cursor: isUploading ? 'default' : 'pointer', fontSize: 13, fontWeight: 600,
              color: isUploading ? 'var(--k-sub)' : isRejected ? '#F56565' : 'var(--k-accent)',
              background: isUploading ? 'var(--k-input)' : 'transparent',
            }}>
              {isUploading ? '⏳ Mengupload...' : doc?.file_path ? '🔄 Upload Ulang' : '📤 Upload Foto'}
            </div>
            <input type="file" accept="image/*" style={{ display: 'none' }}
              disabled={isUploading} onChange={handleFile} ref={fileRef} />
          </label>
        </div>
      )}

      {isApproved && (
        <div style={{ padding: '8px 16px 16px' }}>
          <div style={{ fontSize: 12, color: '#00C896', fontWeight: 600 }}>✓ Dokumen diverifikasi</div>
        </div>
      )}
    </div>
  )
}

export default function MitraOnboardingPage() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [uploading, setUploading] = useState(null)
  const [toast,     setToast]     = useState(null)
  const pollRef = useRef(null)

  function showToast(type, msg) {
    setToast({ type, msg }); setTimeout(() => setToast(null), 4000)
  }

  async function load() {
    try {
      const res = await api.get('/mitra/onboarding/status')
      setData(res.data)
      // Jika sudah aktif, redirect ke dashboard
      if (res.data.account_status === 'active') {
        navigate('/dashboard', { replace: true })
      }
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    // Poll setiap 30 detik untuk update status dari admin
    pollRef.current = setInterval(load, 30000)
    return () => clearInterval(pollRef.current)
  }, [])

  async function handleUpload(type, file) {
    setUploading(type)
    try {
      const fd = new FormData()
      fd.append('type', type)
      fd.append('file', file)
      await api.post('/mitra/onboarding/documents', fd)
      showToast('success', 'Dokumen berhasil diupload.')
      await load()
    } catch (e) {
      showToast('error', e.response?.data?.message || 'Gagal upload.')
    } finally { setUploading(null) }
  }

  const allUploaded  = data?.all_uploaded
  const anyRejected  = data?.any_rejected
  const docs         = data?.documents ?? []

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--k-sub)' }}>Memuat...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 40 }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14,
          background: toast.type === 'success' ? '#00C896' : '#F56565', color: '#fff',
          whiteSpace: 'nowrap',
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{
        padding: '28px 20px 20px', background: 'var(--k-card)',
        borderBottom: '1px solid var(--k-border)', textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏍️</div>
        <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 8 }}>
          Verifikasi Akun Mitra
        </div>
        <div style={{ fontSize: 14, color: 'var(--k-sub)', maxWidth: 340, margin: '0 auto' }}>
          Upload 4 dokumen berikut untuk mengaktifkan akun Anda. Admin akan memverifikasi dalam 1×24 jam.
        </div>
      </div>

      {/* Status banner */}
      <div style={{ padding: '16px', maxWidth: 520, margin: '0 auto' }}>
        {anyRejected ? (
          <div style={{
            padding: '14px 18px', borderRadius: 14, marginBottom: 16,
            background: 'rgba(245,101,101,0.1)', border: '1.5px solid rgba(245,101,101,0.3)',
          }}>
            <div style={{ fontWeight: 700, color: '#F56565', marginBottom: 4 }}>Dokumen Ditolak</div>
            <div style={{ fontSize: 13, color: 'var(--k-sub)' }}>
              Beberapa dokumen ditolak. Periksa keterangan di bawah dan upload ulang dokumen yang benar.
            </div>
          </div>
        ) : allUploaded ? (
          <div style={{
            padding: '14px 18px', borderRadius: 14, marginBottom: 16,
            background: 'rgba(0,200,150,0.1)', border: '1.5px solid rgba(0,200,150,0.3)',
          }}>
            <div style={{ fontWeight: 700, color: '#00C896', marginBottom: 4 }}>Semua Dokumen Terkirim ✓</div>
            <div style={{ fontSize: 13, color: 'var(--k-sub)' }}>
              Admin sedang memverifikasi. Halaman ini akan otomatis update saat status berubah.
            </div>
          </div>
        ) : (
          <div style={{
            padding: '14px 18px', borderRadius: 14, marginBottom: 16,
            background: 'rgba(246,173,85,0.1)', border: '1.5px solid rgba(246,173,85,0.3)',
          }}>
            <div style={{ fontWeight: 700, color: '#F6AD55', marginBottom: 4 }}>
              {docs.filter(d => d.uploaded).length} / 4 Dokumen Terkirim
            </div>
            <div style={{ fontSize: 13, color: 'var(--k-sub)' }}>
              Upload semua dokumen untuk mengirim permohonan verifikasi.
            </div>
          </div>
        )}

        {/* Daftar dokumen */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {DOC_CONFIG.map(config => {
            const doc = docs.find(d => d.type === config.type)
            return (
              <DocCard
                key={config.type}
                config={config}
                doc={doc}
                onUpload={handleUpload}
                uploading={uploading}
              />
            )
          })}
        </div>

        {/* Info tambahan */}
        <div style={{
          marginTop: 24, padding: '16px', borderRadius: 12,
          background: 'var(--k-card)', border: '1px solid var(--k-border)',
          fontSize: 13, color: 'var(--k-sub)',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--k-text)' }}>Persyaratan Dokumen</div>
          <div>• Foto harus jelas, tidak buram, dan tidak terpotong</div>
          <div>• Pastikan semua teks pada dokumen dapat dibaca</div>
          <div>• Format: JPG, PNG, atau WEBP · Maks 10 MB per file</div>
          <div>• Dokumen harus atas nama Anda sendiri</div>
        </div>
      </div>
    </div>
  )
}
