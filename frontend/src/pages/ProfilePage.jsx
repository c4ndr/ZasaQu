import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BottomNav from '../components/BottomNav'
import api from '../services/api'

// ── Baris notifikasi yang bisa diklik ────────────────────────────────────────
function NotifRow() {
  const [perm, setPerm] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )
  const [requesting, setRequesting] = useState(false)

  const handleClick = useCallback(async () => {
    if (perm === 'unsupported') return
    if (perm === 'denied') {
      alert('Notifikasi diblokir oleh browser. Buka Pengaturan browser → izinkan notifikasi untuk situs ini.')
      return
    }
    if (perm === 'granted') {
      // Sudah aktif — tampilkan notif test
      try {
        new Notification('✅ Notifikasi Aktif', {
          body: 'Notifikasi order ZasaQu sudah aktif.',
          icon: '/icon-192.png',
        })
      } catch {}
      return
    }
    // Status 'default' → minta izin
    setRequesting(true)
    try {
      const result = await Notification.requestPermission()
      setPerm(result)
    } finally {
      setRequesting(false)
    }
  }, [perm])

  const label = {
    granted:     '✓ Aktif — tap untuk tes notifikasi',
    denied:      '⛔ Diblokir — buka pengaturan browser',
    default:     'Tap untuk izinkan notifikasi order',
    unsupported: 'Browser tidak mendukung notifikasi',
  }[perm] ?? ''

  const color = perm === 'granted' ? 'var(--k-accent)' : perm === 'denied' ? 'var(--k-danger)' : 'var(--k-muted)'

  return (
    <button
      onClick={handleClick}
      disabled={requesting || perm === 'unsupported'}
      style={{
        width: '100%', padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'none', border: 'none', cursor: perm === 'unsupported' ? 'default' : 'pointer',
        textAlign: 'left', opacity: requesting ? 0.6 : 1,
      }}
    >
      <span style={{ fontSize: 18 }}>{perm === 'granted' ? '🔔' : perm === 'denied' ? '🔕' : '🔔'}</span>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--k-text)', marginBottom: 2 }}>Notifikasi</p>
        <p style={{ fontSize: 12, color }}>{requesting ? 'Meminta izin...' : label}</p>
      </div>
      {perm !== 'granted' && perm !== 'denied' && perm !== 'unsupported' && (
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--k-accent)', fontWeight: 700 }}>Aktifkan</span>
      )}
    </button>
  )
}

const ROLE_LABEL = {
  pelanggan:   { label: 'Pelanggan',   color: '#00C896', bg: 'rgba(0,200,150,0.12)'   },
  mitra_motor: { label: 'Mitra Motor', color: '#63B3ED', bg: 'rgba(99,179,237,0.12)'  },
  mitra_mobil: { label: 'Mitra Mobil', color: '#63B3ED', bg: 'rgba(99,179,237,0.12)'  },
}

function Avatar({ name, size = 72 }) {
  const initial = (name ?? '?')[0].toUpperCase()
  const hue = [...(name ?? 'U')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${hue}, 55%, 35%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 800, color: '#fff',
    }}>{initial}</div>
  )
}

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth()
  const navigate = useNavigate()

  // ── State form edit profil ────────────────────────────────────────────────
  const [showEdit,   setShowEdit]   = useState(false)
  const [editForm,   setEditForm]   = useState({})
  const [editErr,    setEditErr]    = useState('')
  const [editOk,     setEditOk]     = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)

  // ── State form ubah password ──────────────────────────────────────────────
  const [showPassForm,    setShowPassForm]    = useState(false)
  const [oldPass,         setOldPass]         = useState('')
  const [newPass,         setNewPass]         = useState('')
  const [confPass,        setConfPass]        = useState('')
  const [passErr,         setPassErr]         = useState('')
  const [passOk,          setPassOk]          = useState(false)
  const [savingPass,      setSavingPass]      = useState(false)
  const [showOldPass,     setShowOldPass]     = useState(false)
  const [showNewPass,     setShowNewPass]     = useState(false)
  const [showConfPass,    setShowConfPass]    = useState(false)

  const roleInfo = ROLE_LABEL[user?.role] ?? { label: user?.role, color: '#A0A0BC', bg: 'rgba(160,160,188,0.1)' }
  const isMitra  = user?.role?.startsWith('mitra')

  function openEdit() {
    setEditForm({
      name:          user?.name          ?? '',
      email:         user?.email         ?? '',
      phone:         user?.phone         ?? '',
      address:       user?.address       ?? '',
      vehicle_plate: user?.mitra_detail?.vehicle_plate ?? '',
      vehicle_brand: user?.mitra_detail?.vehicle_brand ?? '',
      vehicle_year:  user?.mitra_detail?.vehicle_year  ?? '',
    })
    setEditErr(''); setEditOk(false)
    setShowEdit(true)
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    setEditErr(''); setEditOk(false); setSavingEdit(true)
    try {
      const payload = {
        name:    editForm.name,
        email:   editForm.email,
        phone:   editForm.phone   || null,
        address: editForm.address || null,
      }
      if (isMitra) {
        payload.vehicle_plate = editForm.vehicle_plate || null
        payload.vehicle_brand = editForm.vehicle_brand || null
        payload.vehicle_year  = editForm.vehicle_year  ? parseInt(editForm.vehicle_year) : null
      }
      const res = await api.patch('/auth/profile', payload)
      updateUser(res.data.user)
      setEditOk(true)
      setTimeout(() => setShowEdit(false), 1200)
    } catch (err) {
      const errs = err.response?.data?.errors
      setEditErr(errs ? Object.values(errs).flat().join(' ') : (err.response?.data?.message ?? 'Gagal menyimpan.'))
    } finally { setSavingEdit(false) }
  }

  async function handleChangePass(e) {
    e.preventDefault()
    setPassErr(''); setPassOk(false)
    if (newPass.length < 6) { setPassErr('Password baru minimal 6 karakter.'); return }
    if (newPass !== confPass) { setPassErr('Konfirmasi password tidak cocok.'); return }
    setSavingPass(true)
    try {
      await api.post('/auth/change-password', { current_password: oldPass, new_password: newPass, new_password_confirmation: confPass })
      setPassOk(true); setOldPass(''); setNewPass(''); setConfPass('')
      setTimeout(() => setShowPassForm(false), 1500)
    } catch (err) {
      setPassErr(err.response?.data?.message ?? 'Gagal mengubah password.')
    } finally { setSavingPass(false) }
  }

  async function handleLogout() {
    try { await api.post('/auth/logout') } catch {}
    logout(); navigate('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 100 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ padding: '52px 20px 24px', background: 'linear-gradient(180deg, #0C0C22 0%, var(--k-bg) 100%)', textAlign: 'center' }}>
        <Avatar name={user?.name} size={80} />
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--k-text)', marginTop: 14, marginBottom: 6 }}>
          {user?.name}
        </h2>
        <span style={{ padding: '5px 14px', borderRadius: 100, fontSize: 12, fontWeight: 700, background: roleInfo.bg, color: roleInfo.color }}>
          {roleInfo.label}
        </span>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Informasi Akun */}
        <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', background: 'var(--k-card2)', borderBottom: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Informasi Akun</p>
            <button onClick={showEdit ? () => setShowEdit(false) : openEdit}
              style={{ padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                background: showEdit ? 'var(--k-card)' : 'var(--k-accent)',
                color: showEdit ? 'var(--k-muted)' : '#0C0C16',
                border: showEdit ? '1px solid var(--k-border)' : 'none' }}>
              {showEdit ? 'Batal' : '✏️ Edit'}
            </button>
          </div>

          {/* Mode tampil */}
          {!showEdit && <>
            {[
              { label: 'Nama Lengkap', value: user?.name },
              { label: 'Email',        value: user?.email ?? '—' },
              { label: 'No. Telepon',  value: user?.phone || '—' },
              { label: 'Alamat',       value: user?.address || '—' },
              { label: 'Status Akun',  value: user?.status ?? 'active', badge: true },
            ].map(row => (
              <div key={row.label} style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--k-border)' }}>
                <p style={{ fontSize: 13, color: 'var(--k-muted)' }}>{row.label}</p>
                {row.badge ? (
                  <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700,
                    background: row.value === 'active' ? 'rgba(0,200,150,0.1)' : 'rgba(245,101,101,0.1)',
                    color: row.value === 'active' ? 'var(--k-accent)' : 'var(--k-danger)' }}>
                    {row.value === 'active' ? 'Aktif' : row.value}
                  </span>
                ) : (
                  <p style={{ fontSize: 13, fontWeight: 600, color: row.value === '—' ? 'var(--k-muted)' : 'var(--k-text)', textAlign: 'right', maxWidth: '60%' }}>{row.value}</p>
                )}
              </div>
            ))}
            {isMitra && user?.mitra_detail?.vehicle_plate && (
              <div style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--k-border)' }}>
                <p style={{ fontSize: 13, color: 'var(--k-muted)' }}>Plat Kendaraan</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', fontFamily: 'monospace' }}>{user.mitra_detail.vehicle_plate}</p>
              </div>
            )}
            <div style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 13, color: 'var(--k-muted)' }}>ID Akun</p>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--k-muted)', fontFamily: 'monospace' }}>#{user?.id}</p>
            </div>
          </>}

          {/* Mode edit */}
          {showEdit && (
            <form onSubmit={handleSaveProfile} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Nama Lengkap', key: 'name',    type: 'text',  placeholder: 'Nama lengkap', required: true },
                { label: 'Email',        key: 'email',   type: 'email', placeholder: 'email@contoh.com', required: true },
                { label: 'No. Telepon',  key: 'phone',   type: 'tel',   placeholder: '08xxxxxxxxxx' },
                { label: 'Alamat',       key: 'address', type: 'text',  placeholder: 'Jl. Contoh No. 1, Kota' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, color: 'var(--k-muted)', display: 'block', marginBottom: 5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.label}</label>
                  <input
                    type={f.type} value={editForm[f.key] ?? ''} required={f.required}
                    onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width: '100%', padding: '11px 13px', borderRadius: 12, background: 'var(--k-card2)', border: '1px solid var(--k-border)', color: 'var(--k-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}

              {/* Field kendaraan mitra */}
              {isMitra && (
                <div style={{ background: 'var(--k-card2)', borderRadius: 14, padding: '14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Data Kendaraan</p>
                  {[
                    { label: 'Plat Nomor', key: 'vehicle_plate', placeholder: 'B 1234 ABC' },
                    { label: 'Merek',      key: 'vehicle_brand', placeholder: 'Honda' },
                    { label: 'Tahun',      key: 'vehicle_year',  placeholder: '2022', type: 'number' },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize: 11, color: 'var(--k-muted)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                      <input type={f.type || 'text'} value={editForm[f.key] ?? ''}
                        onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, background: 'var(--k-card)', border: '1px solid var(--k-border)', color: 'var(--k-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  ))}
                </div>
              )}

              {editErr && <p style={{ color: 'var(--k-danger)', fontSize: 12 }}>⚠ {editErr}</p>}
              {editOk  && <p style={{ color: 'var(--k-accent)', fontSize: 12 }}>✓ Profil berhasil disimpan</p>}

              <button type="submit" disabled={savingEdit}
                style={{ padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
                  background: savingEdit ? 'var(--k-card2)' : 'var(--k-accent)',
                  color: savingEdit ? 'var(--k-muted)' : '#0C0C16' }}>
                {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </form>
          )}
        </div>

        {/* Wallet */}
        <button onClick={() => navigate('/wallet')} style={{
          background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 20,
          padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', textAlign: 'left', width: '100%',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(0,200,150,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💳</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', marginBottom: 2 }}>Saldo Wallet</p>
              <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--k-accent)' }}>
                Rp {Number(user?.wallet?.balance ?? 0).toLocaleString('id-ID')}
              </p>
            </div>
          </div>
          <span style={{ fontSize: 18, color: 'var(--k-muted)' }}>›</span>
        </button>

        {/* Pengaturan */}
        <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', background: 'var(--k-card2)', borderBottom: '1px solid var(--k-border)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Pengaturan</p>
          </div>

          {/* Ubah Password */}
          <div style={{ borderBottom: '1px solid var(--k-border)' }}>
            <button onClick={() => { setShowPassForm(s => !s); setPassErr(''); setPassOk(false) }} style={{
              width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 18 }}>🔑</span>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--k-text)' }}>Ubah Password</p>
              </div>
              <span style={{ fontSize: 16, color: 'var(--k-muted)', transform: showPassForm ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
            </button>

            {showPassForm && (
              <form onSubmit={handleChangePass} style={{ padding: '0 18px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Password Lama',      val: oldPass,  set: setOldPass,  show: showOldPass,  setShow: setShowOldPass  },
                  { label: 'Password Baru',       val: newPass,  set: setNewPass,  show: showNewPass,  setShow: setShowNewPass  },
                  { label: 'Konfirmasi Password', val: confPass, set: setConfPass, show: showConfPass, setShow: setShowConfPass },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ fontSize: 11, color: 'var(--k-muted)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                    <div style={{ position: 'relative' }}>
                      <input type={f.show ? 'text' : 'password'} value={f.val} onChange={e => f.set(e.target.value)} required
                        style={{ width: '100%', padding: '11px 40px 11px 13px', borderRadius: 12, background: 'var(--k-card2)', border: '1px solid var(--k-border)', color: 'var(--k-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                      <button type="button" onClick={() => f.setShow(v => !v)}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--k-muted)', fontSize: 16, lineHeight: 1, padding: 0 }}
                        aria-label={f.show ? 'Sembunyikan' : 'Tampilkan'}>
                        {f.show ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>
                ))}
                {passErr && <p style={{ color: 'var(--k-danger)', fontSize: 12 }}>⚠ {passErr}</p>}
                {passOk  && <p style={{ color: 'var(--k-accent)', fontSize: 12 }}>✓ Password berhasil diubah</p>}
                <button type="submit" disabled={savingPass} style={{
                  padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: savingPass ? 'var(--k-card2)' : 'var(--k-accent)', color: savingPass ? 'var(--k-muted)' : '#0C0C16', fontWeight: 700, fontSize: 13,
                }}>
                  {savingPass ? 'Menyimpan...' : 'Simpan Password'}
                </button>
              </form>
            )}
          </div>

          {/* Tentang */}
          <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--k-border)' }}>
            <span style={{ fontSize: 18 }}>ℹ️</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--k-text)', marginBottom: 2 }}>ZasaQu</p>
              <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>Aplikasi jasa titip & pengiriman lokal</p>
            </div>
          </div>

          {/* Notifikasi — bisa diklik untuk minta/cek izin */}
          <NotifRow />
        </div>

        {/* Logout */}
        <button onClick={handleLogout} style={{
          width: '100%', padding: '16px', borderRadius: 18, border: '1.5px solid rgba(245,101,101,0.3)',
          background: 'rgba(245,101,101,0.06)', color: 'var(--k-danger)',
          fontWeight: 800, fontSize: 15, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          🚪 Keluar dari Akun
        </button>

      </div>
      <BottomNav />
    </div>
  )
}
