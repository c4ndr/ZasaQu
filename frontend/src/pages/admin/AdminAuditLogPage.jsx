import { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'

const ACTION_LABELS = {
  update_setting:  'Ubah Pengaturan',
  confirm_topup:   'Konfirmasi Top Up',
  reject_topup:    'Tolak Top Up',
  process_withdraw:'Proses Withdraw',
  activate_user:   'Aktifkan User',
  suspend_user:    'Suspend User',
  ban_user:        'Ban User',
}

const ACTION_STYLE = {
  update_setting:   { bg: 'rgba(99,179,237,0.12)',   color: 'var(--k-info)',   dot: 'var(--k-info)' },
  confirm_topup:    { bg: 'rgba(0,200,150,0.12)',    color: 'var(--k-accent)', dot: 'var(--k-accent)' },
  reject_topup:     { bg: 'rgba(245,101,101,0.12)',  color: 'var(--k-danger)', dot: 'var(--k-danger)' },
  process_withdraw: { bg: 'rgba(246,173,85,0.12)',   color: 'var(--k-warn)',   dot: 'var(--k-warn)' },
  activate_user:    { bg: 'rgba(0,200,150,0.12)',    color: 'var(--k-accent)', dot: 'var(--k-accent)' },
  suspend_user:     { bg: 'rgba(246,173,85,0.12)',   color: 'var(--k-warn)',   dot: 'var(--k-warn)' },
  ban_user:         { bg: 'rgba(245,101,101,0.12)',  color: 'var(--k-danger)', dot: 'var(--k-danger)' },
}

function formatDate(d) { return new Date(d).toLocaleString('id-ID') }

function ActionBadge({ action }) {
  const s = ACTION_STYLE[action] || { bg: 'rgba(160,160,188,0.10)', color: 'var(--k-sub)', dot: 'var(--k-sub)' }
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: 100,
      fontSize: 12,
      fontWeight: 700,
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.color}33`,
      letterSpacing: '0.02em',
    }}>
      {ACTION_LABELS[action] ?? action}
    </span>
  )
}

const spinnerStyle = {
  width: 32,
  height: 32,
  border: '3px solid var(--k-border)',
  borderTop: '3px solid var(--k-accent)',
  borderRadius: '50%',
  animation: 'spin 0.7s linear infinite',
}

export default function AdminAuditLogPage() {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    api.get('/admin/audit-logs')
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AdminLayout>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Sub-judul */}
      <p style={{ color: 'var(--k-muted)', fontSize: 14, marginBottom: 24 }}>
        Semua aksi admin tercatat di sini
      </p>

      {/* Card container */}
      <div style={{
        background: 'var(--k-card)',
        border: '1px solid var(--k-border)',
        borderRadius: 20,
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 24px', gap: 16 }}>
            <div style={spinnerStyle} />
            <span style={{ color: 'var(--k-muted)', fontSize: 14 }}>Memuat log audit...</span>
          </div>
        ) : data?.data?.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 24px', gap: 12 }}>
            <span style={{ fontSize: 40 }}>📋</span>
            <span style={{ color: 'var(--k-muted)', fontSize: 14 }}>Belum ada log audit</span>
          </div>
        ) : (
          /* Timeline wrapper */
          <div style={{ padding: '8px 0' }}>
            {data?.data?.map((log, i) => {
              const s = ACTION_STYLE[log.action] || { dot: 'var(--k-sub)' }
              const isExpanded = expanded === log.id
              const hasDetail = log.old_values || log.new_values

              return (
                <div key={log.id} style={{ display: 'flex', gap: 0 }}>
                  {/* Garis + titik timeline */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: 48,
                    flexShrink: 0,
                    paddingTop: 18,
                  }}>
                    {/* Dot */}
                    <div style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: s.dot,
                      boxShadow: `0 0 0 3px ${s.dot}22`,
                      flexShrink: 0,
                      zIndex: 1,
                    }} />
                    {/* Garis vertikal */}
                    {i < (data?.data?.length - 1) && (
                      <div style={{
                        flex: 1,
                        width: 1,
                        background: 'var(--k-border)',
                        marginTop: 4,
                        minHeight: 24,
                      }} />
                    )}
                  </div>

                  {/* Konten log */}
                  <div style={{
                    flex: 1,
                    padding: '14px 20px 14px 0',
                    borderTop: i === 0 ? 'none' : '1px solid var(--k-border)',
                  }}>
                    {/* Baris atas: badge + tombol detail */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <ActionBadge action={log.action} />
                      {hasDetail && (
                        <button
                          onClick={() => setExpanded(isExpanded ? null : log.id)}
                          style={{
                            padding: '4px 12px',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: '1px solid var(--k-border)',
                            background: isExpanded ? 'var(--k-border)' : 'transparent',
                            color: isExpanded ? 'var(--k-text)' : 'var(--k-sub)',
                            transition: 'all 0.15s',
                          }}
                        >
                          {isExpanded ? 'Tutup' : 'Detail'}
                        </button>
                      )}
                    </div>

                    {/* Baris bawah: pelaku + waktu */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, color: 'var(--k-muted)' }}>
                        oleh{' '}
                        <span style={{ fontWeight: 600, color: 'var(--k-sub)' }}>
                          {log.user?.name ?? 'System'}
                        </span>
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--k-border2)', userSelect: 'none' }}>·</span>
                      <span style={{ fontSize: 12, color: 'var(--k-muted)' }}>
                        {formatDate(log.created_at)}
                      </span>
                    </div>

                    {/* Detail expandable: before / after */}
                    {isExpanded && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: log.old_values && log.new_values ? '1fr 1fr' : '1fr',
                        gap: 10,
                        marginTop: 12,
                      }}>
                        {log.old_values && (
                          <div style={{
                            background: 'rgba(245,101,101,0.06)',
                            border: '1px solid rgba(245,101,101,0.18)',
                            borderRadius: 10,
                            padding: '10px 14px',
                          }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-danger)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              Sebelum
                            </p>
                            <pre style={{
                              fontSize: 12,
                              color: 'var(--k-sub)',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-all',
                              margin: 0,
                              fontFamily: 'monospace',
                              lineHeight: 1.6,
                            }}>
                              {JSON.stringify(log.old_values, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.new_values && (
                          <div style={{
                            background: 'rgba(0,200,150,0.06)',
                            border: '1px solid rgba(0,200,150,0.18)',
                            borderRadius: 10,
                            padding: '10px 14px',
                          }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-accent)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              Sesudah
                            </p>
                            <pre style={{
                              fontSize: 12,
                              color: 'var(--k-sub)',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-all',
                              margin: 0,
                              fontFamily: 'monospace',
                              lineHeight: 1.6,
                            }}>
                              {JSON.stringify(log.new_values, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
