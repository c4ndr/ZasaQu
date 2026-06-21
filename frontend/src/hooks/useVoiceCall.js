import { useEffect, useRef, useState, useCallback } from 'react'
import { Capacitor, registerPlugin } from '@capacitor/core'
import echo from '../services/echo'
import api from '../services/api'
import { popIncomingCall, onIncomingCallUpdate, consumeAutoAnswer } from '../services/callBuffer'
import { startRingtone, stopRingtone, startRingback, stopRingback } from '../utils/ringtone'

// Agora Voice plugin — audio native Android, tanpa WebView getUserMedia
const AgoraVoice = registerPlugin('AgoraVoice')
const APP_ID     = import.meta.env.VITE_AGORA_APP_ID || ''
const IS_ANDROID = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

export default function useVoiceCall(orderId, orderType = 'zasago', currentUserId) {
  const [callState, setCallState] = useState('idle')   // idle | ringing | active | ended
  const [isMuted,   setIsMuted]   = useState(false)
  const [isSpeaker, setIsSpeaker] = useState(false)
  const [duration,  setDuration]  = useState(0)
  const [callError, setCallError] = useState(null)

  const channelRef     = useRef(null)
  const timerRef       = useRef(null)
  const isCallerRef    = useRef(false)
  const pendingOfferRef = useRef(null)   // tidak dipakai Agora, dijaga untuk compat
  const autoAnswerRef  = useRef(false)
  const startingRef    = useRef(false)
  const agoraJoined    = useRef(false)
  const remoteAudio    = useRef(null)    // Agora tidak butuh ini, dijaga untuk CallModal
  const cachedTokenRef = useRef(null)    // token di-prefetch saat mount untuk percepat joinChannel

  // Nama channel Agora — pakai orderId sehingga kedua pihak join ke channel yang sama
  const agoraChannel = `${orderType}_${orderId}`

  // Pre-fetch token Agora saat ChatPage mount agar joinChannel tidak perlu tunggu API
  useEffect(() => {
    if (!IS_ANDROID || !orderId) return
    const uid = currentUserId ? parseInt(currentUserId) : 0
    api.post('/call/agora-token', { channel_name: agoraChannel, uid })
      .then(({ data }) => { cachedTokenRef.current = data.token })
      .catch(() => {})
  }, [agoraChannel, currentUserId]) // eslint-disable-line

  // ─── Incoming call buffer (sama seperti sebelumnya) ──────────────────────────
  useEffect(() => {
    if (!orderId) return
    const buffered = popIncomingCall()
    if (buffered && String(buffered.orderId) === String(orderId) && buffered.orderType === orderType) {
      if (buffered.offer) pendingOfferRef.current = buffered.offer
      autoAnswerRef.current = consumeAutoAnswer()
      setCallState('ringing')
    }
    const unsub = onIncomingCallUpdate((data) => {
      if (String(data.orderId) === String(orderId) && data.orderType === orderType) {
        if (data.offer) pendingOfferRef.current = data.offer
        if (!autoAnswerRef.current) autoAnswerRef.current = consumeAutoAnswer()
        setCallState('ringing')
      }
    })
    return unsub
  }, []) // eslint-disable-line

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const sendSignal = useCallback(async (type, data = null) => {
    try {
      await api.post('/call/signal', { order_id: orderId, order_type: orderType, signal_type: type, data })
    } catch {}
  }, [orderId, orderType])

  const startTimer = useCallback(() => {
    setDuration(0)
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
  }, [])

  const cleanupAgora = useCallback(async () => {
    clearInterval(timerRef.current)
    if (agoraJoined.current) {
      try { await AgoraVoice.leaveChannel() } catch {}
      agoraJoined.current = false
    }
    startingRef.current     = false
    isCallerRef.current     = false   // reset agar panggilan berikutnya bisa menerima
    pendingOfferRef.current = null
    cachedTokenRef.current  = null
    setCallState('idle')
    setDuration(0)
    setIsMuted(false)
    setIsSpeaker(false)
    try { await AgoraVoice.setSpeaker({ speaker: false }) } catch {}
    stopRingtone()
    stopRingback()
  }, [])

  const joinAgora = useCallback(async () => {
    try {
      await AgoraVoice.initialize({ appId: APP_ID })
    } catch (e) {
      throw new Error('init: ' + (e?.message || JSON.stringify(e)))
    }
    const uid = currentUserId ? parseInt(currentUserId) : 0
    // Pakai cached token jika tersedia (di-prefetch saat mount) — hindari round-trip API
    let token = cachedTokenRef.current
    cachedTokenRef.current = null   // pakai sekali saja, fetch ulang jika perlu
    if (!token) {
      try {
        const { data } = await api.post('/call/agora-token', { channel_name: agoraChannel, uid })
        token = data.token
      } catch (e) {
        throw new Error('token: ' + (e?.response?.status || e?.message || JSON.stringify(e)))
      }
    }
    try {
      await AgoraVoice.joinChannel({ token, channelName: agoraChannel, uid })
    } catch (e) {
      throw new Error('join: ' + (e?.message || JSON.stringify(e)))
    }
    agoraJoined.current = true
  }, [agoraChannel, currentUserId])

  // ─── Mulai panggilan (caller) ─────────────────────────────────────────────────
  const startCall = useCallback(async () => {
    if (!IS_ANDROID) {
      setCallError('Panggilan suara hanya tersedia di aplikasi Android.')
      return
    }
    if (!orderId || callState !== 'idle' || startingRef.current) return
    startingRef.current = true
    setCallError(null)
    await stopRingtone()
    try {
      isCallerRef.current = true
      setCallState('ringing')
      await sendSignal('ring')
      await joinAgora()
      // Tunggu event userJoined untuk pindah ke state active
    } catch (err) {
      sendSignal('end')
      await cleanupAgora()
      setCallError('Gagal: ' + (err?.message || err?.name || JSON.stringify(err)))
    } finally {
      startingRef.current = false
    }
  }, [orderId, callState, sendSignal, joinAgora, cleanupAgora])

  // ─── Jawab panggilan (callee) ─────────────────────────────────────────────────
  const answerCall = useCallback(async () => {
    if (!IS_ANDROID) {
      setCallError('Panggilan suara hanya tersedia di aplikasi Android.')
      return
    }
    if (startingRef.current) return
    startingRef.current = true
    setCallError(null)
    await stopRingtone()
    try {
      isCallerRef.current = false
      await joinAgora()
      setCallState('active')
      startTimer()
    } catch (err) {
      setCallError('Gagal menjawab panggilan. Periksa koneksi internet.')
    } finally {
      startingRef.current = false
    }
  }, [joinAgora, startTimer])

  // ─── Akhiri panggilan ─────────────────────────────────────────────────────────
  const endCall = useCallback(async () => {
    sendSignal('end')
    await cleanupAgora()
  }, [sendSignal, cleanupAgora])

  // ─── Toggle mute ──────────────────────────────────────────────────────────────
  const toggleMute = useCallback(async () => {
    const newMuted = !isMuted
    try { await AgoraVoice.muteLocalAudio({ mute: newMuted }) } catch {}
    setIsMuted(newMuted)
  }, [isMuted])

  // ─── Toggle loudspeaker ───────────────────────────────────────────────────────
  const toggleSpeaker = useCallback(async () => {
    const newSpeaker = !isSpeaker
    try { await AgoraVoice.setSpeaker({ speaker: newSpeaker }) } catch {}
    setIsSpeaker(newSpeaker)
  }, [isSpeaker])

  // ─── Agora event listeners ────────────────────────────────────────────────────
  // Ref agar listener bisa akses versi terbaru fungsi tanpa re-subscribe
  const startTimerRef  = useRef(startTimer)
  const cleanupAgoraRef = useRef(cleanupAgora)
  useEffect(() => { startTimerRef.current  = startTimer  }, [startTimer])
  useEffect(() => { cleanupAgoraRef.current = cleanupAgora }, [cleanupAgora])

  useEffect(() => {
    if (!IS_ANDROID) return
    const listeners = []
    const setup = async () => {
      // Saat lawan bicara join channel → panggilan aktif (untuk caller)
      // Hentikan ringback/ringtone LANGSUNG sebelum React commit — cegah tumpang tindih
      // antara ringback dan audio Agora yang sudah mengalir.
      const l1 = await AgoraVoice.addListener('userJoined', () => {
        stopRingtone()
        stopRingback()
        setCallState(prev => {
          if (prev === 'ringing') { startTimerRef.current(); return 'active' }
          return prev
        })
      })
      // Saat lawan bicara meninggalkan channel → panggilan berakhir
      const l2 = await AgoraVoice.addListener('userOffline', () => {
        cleanupAgoraRef.current()
      })
      // Error Agora
      const l3 = await AgoraVoice.addListener('agoraError', (data) => {
        setCallError('Koneksi suara terputus (err ' + data.code + '). Coba lagi.')
        cleanupAgoraRef.current()
      })
      // Token hampir expired → perbarui otomatis tanpa memutus panggilan
      const renewToken = async () => {
        try {
          const uid = currentUserId ? parseInt(currentUserId) : 0
          const { data } = await api.post('/call/agora-token', { channel_name: agoraChannel, uid })
          await AgoraVoice.renewToken({ token: data.token })
        } catch {}
      }
      const l4 = await AgoraVoice.addListener('tokenWillExpire', renewToken)
      const l5 = await AgoraVoice.addListener('tokenExpired',    renewToken)
      listeners.push(l1, l2, l3, l4, l5)
    }
    setup()
    return () => { listeners.forEach(l => { try { l?.remove() } catch {} }) }
  }, []) // eslint-disable-line — setup sekali, gunakan ref untuk akses fungsi terbaru

  // ─── Reverb signaling (ring + end saja, offer/answer tidak dipakai Agora) ────
  useEffect(() => {
    if (!orderId) return
    const ch = echo.private(`call.${orderType}.${orderId}`)
    channelRef.current = ch

    ch.listen('.call.signal', async ({ signal_type, sender_id }) => {
      if (sender_id === currentUserId) return
      if (signal_type === 'ring') setCallState('ringing')
      if (signal_type === 'end') cleanupAgoraRef.current()
    })

    return () => {
      echo.leave(`call.${orderType}.${orderId}`)
      channelRef.current = null
    }
  }, [orderId, orderType, currentUserId]) // eslint-disable-line

  // ─── Nada dering / ringback ───────────────────────────────────────────────────
  useEffect(() => {
    if (callState === 'ringing') {
      if (isCallerRef.current) {
        stopRingtone()
        startRingback()           // pemanggil: tut-tut-tut
      } else if (!autoAnswerRef.current) {
        stopRingback()
        startRingtone()           // penerima: nada dering keras
      }
    } else {
      stopRingtone()
      stopRingback()
    }
    return () => { stopRingtone(); stopRingback() }
  }, [callState]) // eslint-disable-line

  // ─── Auto-answer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (callState === 'ringing' && autoAnswerRef.current) {
      autoAnswerRef.current = false
      answerCall()
    }
  }, [callState]) // eslint-disable-line

  // ─── Cleanup saat unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => { cleanupAgoraRef.current() }
  }, [])

  return {
    callState, isMuted, isSpeaker, duration,
    iceState: '',   // tidak dipakai Agora, dijaga agar CallModal tidak error
    remoteAudio,    // audio dikelola native oleh Agora, bukan lewat <audio> element
    isCaller: isCallerRef.current,
    callError,
    clearCallError: () => setCallError(null),
    startCall, answerCall, endCall, toggleMute, toggleSpeaker,
  }
}
