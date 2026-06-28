import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import 'maplibre-gl/dist/maplibre-gl.css'
import './index.css'
import './theme.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  state = { error: null, info: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) {
    const msg = `[${new Date().toISOString()}] ${error?.toString?.() ?? error}\n\nComponent Stack:${info?.componentStack ?? ''}\n\nStack:${error?.stack ?? ''}`
    try { localStorage.setItem('zasaqu_last_error', msg) } catch {}
    try {
      fetch('/api/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ message: error?.toString?.() ?? String(error), stack: error?.stack ?? '', component: info?.componentStack ?? '', url: location.href }),
      }).catch(() => {})
    } catch {}
  }
  render() {
    if (this.state.error) {
      const saved = (() => { try { return localStorage.getItem('zasaqu_last_error') ?? '' } catch { return '' } })()
      return (
        <div style={{ padding: '2rem', fontFamily: 'monospace', background: '#0A0A0F', color: '#fff', minHeight: '100dvh' }}>
          <h2 style={{ color: '#EF4444' }}>App Error</h2>
          <pre style={{ background: '#1C1C26', padding: '1rem', overflow: 'auto', borderRadius: 8, marginTop: 12, color: '#9CA3AF', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {saved || (this.state.error.toString() + '\n\n' + this.state.error.stack)}
          </pre>
          <button onClick={() => window.location.reload()}
            style={{ marginTop: 16, padding: '10px 20px', background: '#00C896', color: '#000', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

