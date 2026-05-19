import { useState, useEffect, useRef } from 'react'

// Input alamat dengan autocomplete Nominatim
export default function LocationSearch({
  value,
  onChange,
  onSelect,
  placeholder = 'Ketik nama jalan, gedung, atau daerah...',
  confirmed = false,
  inputStyle = {},
}) {
  const [suggestions, setSuggestions] = useState([])
  const [open,        setOpen]        = useState(false)
  const [loading,     setLoading]     = useState(false)
  const containerRef = useRef(null)
  const debounceRef  = useRef(null)
  // Mencegah dropdown tertutup saat jari masih menyentuh suggestion
  const touchingRef  = useRef(false)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (value.length < 3) { setSuggestions([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res  = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=5&accept-language=id&countrycodes=id`,
          { headers: { 'Accept-Language': 'id' } }
        )
        const data = await res.json()
        setSuggestions(data)
        setOpen(data.length > 0)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 420)
    return () => clearTimeout(debounceRef.current)
  }, [value])

  useEffect(() => {
    function handleOutside(e) {
      // Jangan tutup saat jari sedang menyentuh item suggestion (fix mobile)
      if (touchingRef.current) return
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [])

  function handleSuggestionSelect(s) {
    onSelect({ lat: parseFloat(s.lat), lng: parseFloat(s.lon), display: s.display_name })
    setOpen(false)
    setSuggestions([])
    touchingRef.current = false
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          style={{
            width: '100%', padding: '12px 40px 12px 14px', borderRadius: 12, boxSizing: 'border-box',
            background: 'var(--k-card2)',
            border: `1px solid ${confirmed ? 'rgba(0,200,150,0.5)' : open ? 'rgba(79,70,229,0.4)' : 'var(--k-border)'}`,
            color: 'var(--k-text)', fontSize: 14, outline: 'none',
            transition: 'border-color 0.2s',
            ...inputStyle,
          }}
        />
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          {loading
            ? <div style={{ width: 14, height: 14, border: '2px solid var(--k-border)', borderTopColor: 'var(--k-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            : confirmed
              ? <span style={{ color: 'var(--k-accent)', fontSize: 14 }}>✓</span>
              : <span style={{ color: 'var(--k-muted)', fontSize: 14 }}>🔍</span>
          }
        </div>
      </div>

      {/* Dropdown saran */}
      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 9999,
          background: 'var(--k-card)', border: '1px solid var(--k-border)',
          borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          maxHeight: 220, overflowY: 'auto',
        }}>
          {suggestions.map((s, i) => (
            <button
              key={s.place_id}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onTouchStart={() => { touchingRef.current = true }}
              onTouchEnd={() => { handleSuggestionSelect(s) }}
              onClick={() => { handleSuggestionSelect(s) }}
              style={{
                width: '100%', textAlign: 'left', padding: '12px 14px',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: i < suggestions.length - 1 ? '1px solid var(--k-border)' : 'none',
                color: 'var(--k-text)', fontSize: 13,
                display: 'flex', alignItems: 'flex-start', gap: 8,
                WebkitTapHighlightColor: 'rgba(0,200,150,0.1)',
              }}
            >
              <span style={{ flexShrink: 0, marginTop: 1, fontSize: 14 }}>📍</span>
              <span style={{ lineHeight: 1.5, wordBreak: 'break-word' }}>{s.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
