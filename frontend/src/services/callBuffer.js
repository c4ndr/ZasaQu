// Buffer module-level untuk incoming call yang datang saat user tidak di ChatPage.
// Bertahan melewati navigasi (tidak di-reset saat komponen unmount).

let _pending    = null   // { orderId, orderType, offer, senderId, callerName }
let _autoAnswer = false  // flag: user sudah tap Angkat di overlay, jawab otomatis di ChatPage
const _listeners = new Set()

export const storeIncomingCall = (data) => {
  _pending = data
  _listeners.forEach(fn => fn(data))
}

export const popIncomingCall = () => {
  const d = _pending
  _pending = null
  return d
}

export const peekIncomingCall = () => _pending

// Tandai bahwa user sudah tap Angkat di IncomingCallOverlay — ChatPage akan auto-jawab
export const markAutoAnswer = () => { _autoAnswer = true }

// Ambil dan reset flag auto-answer
export const consumeAutoAnswer = () => { const v = _autoAnswer; _autoAnswer = false; return v }

// Listener untuk tangkap update setelah mount (mengatasi race condition offer)
export const onIncomingCallUpdate = (fn) => {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}
