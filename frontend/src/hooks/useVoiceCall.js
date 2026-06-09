import { useEffect, useRef, useState, useCallback } from 'react'
import echo from '../services/echo'
import api from '../services/api'

const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

/**
 * WebRTC voice call tanpa expose nomor HP.
 * Signaling dikirim via backend → Reverb → pihak lain.
 *
 * @param {number|string} orderId
 * @param {'zasago'|'zasafood'|'zasamart'} orderType
 * @param {number} currentUserId
 */
export default function useVoiceCall(orderId, orderType = 'zasago', currentUserId) {
  const [callState, setCallState] = useState('idle') // idle | ringing | active | ended
  const [isMuted,   setIsMuted]   = useState(false)
  const [duration,  setDuration]  = useState(0)

  const pcRef         = useRef(null)   // RTCPeerConnection
  const localStream   = useRef(null)
  const remoteStream  = useRef(null)
  const remoteAudio   = useRef(null)   // <audio> element ref (set dari luar)
  const channelRef    = useRef(null)
  const timerRef      = useRef(null)
  const isCallerRef   = useRef(false)

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

  const createPc = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS })

    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal('ice-candidate', e.candidate)
    }

    pc.ontrack = (e) => {
      remoteStream.current = e.streams[0]
      if (remoteAudio.current) {
        remoteAudio.current.srcObject = e.streams[0]
        remoteAudio.current.play().catch(() => {})
      }
    }

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        endCall()
      }
    }

    return pc
  }, [sendSignal]) // eslint-disable-line

  const startTimer = useCallback(() => {
    setDuration(0)
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
  }, [])

  const stopTimer = useCallback(() => {
    clearInterval(timerRef.current)
  }, [])

  const getMic = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    localStream.current = stream
    return stream
  }, [])

  const addTracks = useCallback((pc, stream) => {
    stream.getTracks().forEach(t => pc.addTrack(t, stream))
  }, [])

  /** Mulai panggilan (sebagai caller) */
  const startCall = useCallback(async () => {
    if (!orderId || callState !== 'idle') return
    try {
      isCallerRef.current = true
      setCallState('ringing')
      await sendSignal('ring')

      const stream = await getMic()
      const pc = createPc()
      pcRef.current = pc
      addTracks(pc, stream)

      const offer = await pc.createOffer({ offerToReceiveAudio: true })
      await pc.setLocalDescription(offer)
      await sendSignal('offer', offer)
    } catch {
      setCallState('idle')
    }
  }, [orderId, callState, sendSignal, getMic, createPc, addTracks])

  /** Terima panggilan masuk */
  const answerCall = useCallback(async (offer) => {
    try {
      isCallerRef.current = false
      const stream = await getMic()
      const pc = createPc()
      pcRef.current = pc
      addTracks(pc, stream)

      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      await sendSignal('answer', answer)

      setCallState('active')
      startTimer()
    } catch {
      setCallState('idle')
    }
  }, [getMic, createPc, addTracks, sendSignal, startTimer])

  /** Akhiri panggilan */
  const endCall = useCallback(() => {
    sendSignal('end')
    pcRef.current?.close()
    pcRef.current = null
    localStream.current?.getTracks().forEach(t => t.stop())
    localStream.current = null
    stopTimer()
    setCallState('idle')
    setDuration(0)
    setIsMuted(false)
  }, [sendSignal, stopTimer])

  /** Toggle mute */
  const toggleMute = useCallback(() => {
    if (!localStream.current) return
    const enabled = !isMuted
    localStream.current.getAudioTracks().forEach(t => { t.enabled = enabled })
    setIsMuted(!enabled)
  }, [isMuted])

  // Subscribe ke Reverb channel untuk menerima sinyal
  useEffect(() => {
    if (!orderId) return
    const ch = echo.private(channelName)
    channelRef.current = ch

    ch.listen('.call.signal', async ({ signal_type, data, sender_id }) => {
      if (sender_id === currentUserId) return // abaikan sinyal dari diri sendiri

      if (signal_type === 'ring') {
        setCallState('ringing')
        return
      }

      if (signal_type === 'offer') {
        await answerCall(data)
        return
      }

      if (signal_type === 'answer' && pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data))
        setCallState('active')
        startTimer()
        return
      }

      if (signal_type === 'ice-candidate' && pcRef.current) {
        try { await pcRef.current.addIceCandidate(new RTCIceCandidate(data)) } catch {}
        return
      }

      if (signal_type === 'end') {
        pcRef.current?.close()
        pcRef.current = null
        localStream.current?.getTracks().forEach(t => t.stop())
        localStream.current = null
        stopTimer()
        setCallState('idle')
        setDuration(0)
        setIsMuted(false)
      }
    })

    return () => {
      echo.leave(channelName)
      channelRef.current = null
    }
  }, [orderId, channelName, currentUserId]) // eslint-disable-line

  return {
    callState,
    isMuted,
    duration,
    remoteAudio,  // assign ke ref <audio ref={remoteAudio} />
    startCall,
    answerCall,
    endCall,
    toggleMute,
  }
}
