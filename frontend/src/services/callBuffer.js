// Buffer module-level untuk incoming call yang datang saat user tidak di ChatPage.
// Bertahan melewati navigasi (tidak di-reset saat komponen unmount).

let _pending = null  // { orderId, orderType, offer, senderId }

export const storeIncomingCall = (data) => { _pending = data }
export const popIncomingCall   = ()     => { const d = _pending; _pending = null; return d }
export const peekIncomingCall  = ()     => _pending
