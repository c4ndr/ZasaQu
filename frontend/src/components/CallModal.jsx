import { useRef, useEffect } from 'react'

function formatDuration(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(secs % 60).padStart(2, '0')
  return `${m}:${s}`
}

/**
 * Modal panggilan suara WebRTC — muncul saat callState !== 'idle'.
 * Tidak menampilkan atau menyimpan nomor telepon.
 */
export default function CallModal({ callState, isMuted, isSpeaker, duration, iceState, remoteAudio,
                                    otherName, isCaller, onAnswer, onEnd, onMute, onSpeaker, callError, onClearError }) {
  const audioRef = useRef(null)

  // Sambungkan ref audio ke hook
  useEffect(() => {
    if (remoteAudio) remoteAudio.current = audioRef.current
  }, [remoteAudio])

  if (callState === 'idle') return null

  const isRinging = callState === 'ringing'
  const isActive  = callState === 'active'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(10,10,20,0.95)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24, touchAction: 'manipulation',
    }}>
      <style>{`
        @keyframes callPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(0,200,150,0.5); }
          50%      { box-shadow: 0 0 0 20px rgba(0,200,150,0); }
        }
        @keyframes callRing {
          0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.5); }
          50%      { box-shadow: 0 0 0 20px rgba(99,102,241,0); }
        }
      `}</style>

      {/* Audio element tersembunyi */}
      <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />

      {/* Avatar */}
      <div style={{
        width: 88, height: 88, borderRadius: '50%',
        background: isActive
          ? 'linear-gradient(135deg, #00C896, #00A87D)'
          : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 40, marginBottom: 24,
        animation: isRinging ? 'callRing 1.5s infinite' : isActive ? 'callPulse 2s infinite' : 'none',
      }}>
        {isActive ? '📞' : '📲'}
      </div>

      {/* Nama */}
      <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 8, textAlign: 'center' }}>
        {otherName || 'Pengguna ZasaQu'}
      </p>

      {/* Status */}
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 32, textAlign: 'center' }}>
        {isActive
          ? `🔴 ${formatDuration(duration)}`
          : isRinging && !isCaller
            ? 'Panggilan masuk...'
            : 'Menghubungi...'}
      </p>

      {/* Tombol aksi */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        {/* Mute & Speaker — hanya saat aktif */}
        {isActive && (
          <button onClick={onMute} style={{
            width: 60, height: 60, borderRadius: '50%',
            background: isMuted ? '#EF4444' : 'rgba(255,255,255,0.15)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, touchAction: 'manipulation',
          }}>
            {isMuted ? '🔇' : '🎤'}
          </button>
        )}
        {isActive && (
          <button onClick={onSpeaker} style={{
            width: 60, height: 60, borderRadius: '50%',
            background: isSpeaker ? '#6366F1' : 'rgba(255,255,255,0.15)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, touchAction: 'manipulation',
          }}>
            {isSpeaker ? '🔊' : '🔈'}
          </button>
        )}

        {/* Angkat telepon — hanya callee saat ringing */}
        {isRinging && !isCaller && onAnswer && (
          <button
            onClick={(e) => { e.preventDefault(); onAnswer() }}
            onTouchEnd={(e) => { e.preventDefault(); onAnswer() }}
            style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg, #00C896, #00A87D)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, boxShadow: '0 4px 20px rgba(0,200,150,0.5)',
              touchAction: 'manipulation',
              // Tidak ada animation/transform langsung di tombol — CSS transform menggeser hit area di Android
            }}>
            📞
          </button>
        )}

        {/* Tutup telepon */}
        <button
          onClick={(e) => { e.preventDefault(); onEnd() }}
          onTouchEnd={(e) => { e.preventDefault(); onEnd() }}
          style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #EF4444, #DC2626)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, boxShadow: '0 4px 20px rgba(239,68,68,0.4)',
            touchAction: 'manipulation',
          }}>
          📵
        </button>
      </div>

      {iceState && (
        <p style={{ marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
          ICE: {iceState}
        </p>
      )}
      <p style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
        Panggilan aman — nomor telepon tidak dibagikan
      </p>
    </div>
  )
}
