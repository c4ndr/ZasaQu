import { useEffect, useRef, useState, useCallback } from 'react'
import { Capacitor, registerPlugin } from '@capacitor/core'
import echo from '../services/echo'
import api from '../services/api'

// Plugin lokal untuk meminta izin RECORD_AUDIO lewat Android API
// Hanya dipakai di Android native, web/iOS pakai getUserMedia langsung
const MicrophonePermission = registerPlugin('MicrophonePermission')

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // TURN relay — diperlukan saat kedua pihak di belakang NAT berbeda (jaringan 4G/berbeda ISP)
  {
    urls: [
      'turn:202.73.27.118:3478?transport=udp',
      'turn:202.73.27.118:3478?transport=tcp',
    ],
    username:   'zasaqu',
    credential: '214017cd3f05c4840e2c9fa69f9a4d94',
  },
]

function parseMicError(err) {
  const name = err?.name ?? ''
  if (!navigator.mediaDevices?.getUserMedia || name === 'NotSupportedError') {
    return 'Mikrofon tidak bisa diakses. Pastikan app berjalan lewat HTTPS/localhost.'
  }
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Izin mikrofon ditolak. Buka Pengaturan → Aplikasi → ZasaQu → Izin → aktifkan Mikrofon.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'Mikrofon tidak ditemukan di perangkat ini.'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Mikrofon sedang dipakai aplikasi lain.'
  }
  return `Gagal mengakses mikrofon: ${name || err?.message || 'error tidak diketahui'}`
}

export default function useVoiceCall(orderId, orderType = 'zasago', currentUserId) {
  const [callState,   setCallState]   = useState('idle') // idle | ringing | active | ended
  const [isMuted,     setIsMuted]     = useState(false)
  const [duration,    setDuration]    = useState(0)
  const [callError,   setCallError]   = useState(null)
  const [iceState,    setIceState]    = useState('')    // debug: ICE connection state

  const pcRef              = useRef(null)
  const localStream        = useRef(null)
  const remoteAudio        = useRef(null)
  const channelRef         = useRef(null)
  const timerRef           = useRef(null)
  const isCallerRef        = useRef(false)
  const pendingOfferRef    = useRef(null)   // offer masuk, tunggu user tap Angkat
  const iceCandidateQueue  = useRef([])     // ICE candidates yang datang sebelum remoteDesc di-set
  const startingRef        = useRef(false)  // lock agar double-tap tidak trigger dua kali

  const channelName = `call.${orderType}.${orderId}`

  const sendSignal = useCallback(async (signalType, data = null) => {
    try {
      await api.post('/call/signal', {
        order_id:    orderId,
        order_type:  orderType,
        signal_type: signalType,
        data,
      })
    } catch {}
  }, [orderId, orderType])

  // Cleanup internal tanpa perlu memanggil sendSignal (untuk disconnect callback)
  const cleanupPc = useCallback(() => {
    clearInterval(timerRef.current)
    pcRef.current?.close()
    pcRef.current = null
    localStream.current?.getTracks().forEach(t => t.stop())
    localStream.current = null
    pendingOfferRef.current = null
    iceCandidateQueue.current = []
    setCallState('idle')
    setDuration(0)
    setIsMuted(false)
  }, [])

  const createPc = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal('ice-candidate', e.candidate)
    }

    pc.ontrack = (e) => {
      if (remoteAudio.current) {
        remoteAudio.current.srcObject = e.streams[0]
        remoteAudio.current.play().catch(() => {})
      }
    }

    pc.oniceconnectionstatechange = () => {
      setIceState(pc.iceConnectionState)
    }

    pc.onconnectionstatechange = () => {
      setIceState(pc.connectionState)
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        cleanupPc()
      }
    }

    return pc
  }, [sendSignal, cleanupPc])

  const startTimer = useCallback(() => {
    setDuration(0)
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
  }, [])

  const getMic = useCallback(async () => {
    // Di Android native, minta izin RECORD_AUDIO lewat Capacitor plugin
    // sebelum getUserMedia agar permission dialog muncul dari OS
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      try {
        const { granted } = await MicrophonePermission.request()
        if (!granted) {
          throw Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })
        }
      } catch (e) {
        if (e.name === 'NotAllowedError') throw e
        // Plugin tidak tersedia atau error lain — lanjut ke getUserMedia
      }
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw Object.assign(new Error('mediaDevices not available'), { name: 'NotSupportedError' })
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    localStream.current = stream
    return stream
  }, [])

  /** Mulai panggilan (sebagai caller) */
  const startCall = useCallback(async () => {
    if (!orderId || callState !== 'idle' || startingRef.current) return
    startingRef.current = true
    setCallError(null)
    try {
      isCallerRef.current = true
      setCallState('ringing')
      await sendSignal('ring')

      const stream = await getMic()
      const pc = createPc()
      pcRef.current = pc
      stream.getTracks().forEach(t => pc.addTrack(t, stream))

      const offer = await pc.createOffer({ offerToReceiveAudio: true })
      await pc.setLocalDescription(offer)
      await sendSignal('offer', offer)
    } catch (err) {
      // Beritahu callee bahwa panggilan gagal (agar modal-nya tidak stuck)
      sendSignal('end')
      cleanupPc()
      setCallError(parseMicError(err))
    } finally {
      startingRef.current = false
    }
  }, [orderId, callState, sendSignal, getMic, createPc, cleanupPc])

  /**
   * Terima panggilan masuk — dipanggil saat user tap tombol Angkat.
   * Offer sudah disimpan di pendingOfferRef saat diterima dari Reverb.
   */
  const answerCall = useCallback(async () => {
    const offer = pendingOfferRef.current
    if (!offer) {
      setCallError('Panggilan tidak diterima dengan benar. Coba minta penelepon untuk menelepon ulang.')
      return
    }
    setCallError(null)
    try {
      isCallerRef.current = false
      const stream = await getMic()
      const pc = createPc()
      pcRef.current = pc
      stream.getTracks().forEach(t => pc.addTrack(t, stream))

      await pc.setRemoteDescription(new RTCSessionDescription(offer))

      // Flush ICE candidates yang sudah antri sebelum remote desc di-set
      for (const c of iceCandidateQueue.current) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)) } catch {}
      }
      iceCandidateQueue.current = []

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      await sendSignal('answer', answer)

      pendingOfferRef.current = null
      setCallState('active')
      startTimer()
    } catch (err) {
      cleanupPc()
      setCallError(parseMicError(err))
    }
  }, [getMic, createPc, sendSignal, startTimer, cleanupPc])

  /** Akhiri panggilan */
  const endCall = useCallback(() => {
    sendSignal('end')
    cleanupPc()
  }, [sendSignal, cleanupPc])

  /** Toggle mute */
  const toggleMute = useCallback(() => {
    if (!localStream.current) return
    localStream.current.getAudioTracks().forEach(t => { t.enabled = isMuted })
    setIsMuted(m => !m)
  }, [isMuted])

  // Subscribe ke Reverb channel
  useEffect(() => {
    if (!orderId) return
    const ch = echo.private(channelName)
    channelRef.current = ch

    ch.listen('.call.signal', async ({ signal_type, data, sender_id }) => {
      if (sender_id === currentUserId) return

      if (signal_type === 'ring') {
        setCallState('ringing')
        return
      }

      if (signal_type === 'offer') {
        // Simpan offer, tampilkan UI "Ada panggilan masuk" — user harus tap Angkat
        pendingOfferRef.current = data
        setCallState('ringing')
        return
      }

      if (signal_type === 'answer' && pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data))
        // Flush ICE candidates yang antri
        for (const c of iceCandidateQueue.current) {
          try { await pcRef.current.addIceCandidate(new RTCIceCandidate(c)) } catch {}
        }
        iceCandidateQueue.current = []
        setCallState('active')
        startTimer()
        return
      }

      if (signal_type === 'ice-candidate') {
        if (pcRef.current?.remoteDescription) {
          try { await pcRef.current.addIceCandidate(new RTCIceCandidate(data)) } catch {}
        } else {
          // Remote desc belum di-set, antri dulu
          iceCandidateQueue.current.push(data)
        }
        return
      }

      if (signal_type === 'end') {
        cleanupPc()
      }
    })

    return () => {
      echo.leave(channelName)
      channelRef.current = null
    }
  }, [orderId, channelName, currentUserId, startTimer, cleanupPc]) // eslint-disable-line

  return {
    callState,
    isMuted,
    duration,
    iceState,
    remoteAudio,
    isCaller: isCallerRef.current,
    callError,
    clearCallError: () => setCallError(null),
    startCall,
    answerCall,
    endCall,
    toggleMute,
  }
}
