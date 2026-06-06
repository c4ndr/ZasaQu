import { useState, useEffect, useRef } from 'react'

async function searchNominatim(query, nearLat, nearLng) {
  let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=id&limit=6&accept-language=id&addressdetails=1`
  if (nearLat && nearLng) url += `&viewbox=${nearLng - 0.3},${nearLat + 0.3},${nearLng + 0.3},${nearLat - 0.3}&bounded=0`
  const res = await fetch(url, { headers: { 'User-Agent': 'ZasaQu/1.0' } })
  return res.json()
}

function formatSuggestion(item) {
  const a = item.address || {}
  const main = item.name || a.road || a.hamlet || item.display_name.split(',')[0]
  const parts = [a.suburb || a.village || a.town, a.city || a.county, a.state].filter(Boolean)
  const secondary = parts.slice(0, 2).join(', ')
  return { main, secondary, display: item.display_name }
}

export default function LocationSearch({
  value, onChange, onSelect,
  placeholder = 'Ketik nama jalan, tempat, atau daerah...',
  confirmed = false, inputStyle = {},
  nearLat = null, nearLng = null,
}) {
  const [suggestions, setSuggestions] = useState([])
  const [open,        setOpen]        = useState(false)
  const [loading,     setLoading]     = useState(false)
  const containerRef = useRef(null)
  const debounceRef  = useRef(null)
  const touchingRef  = useRef(false)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (value.length < 2) { setSuggestions([]); setOpen(false); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await searchNominatim(value, nearLat, nearLng)
        setSuggestions(results)
        setOpen(results.length > 0)
      } catch {
        setSuggestions([])
        setOpen(false)
      } finally {
        setLoading(false)
      }
    }, 400)

    return () => clearTimeout(debounceRef.current)
  }, [value, nearLat, nearLng])

  useEffect(() => {
    function handleOutside(e) {
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

  function handleSelect(item) {
    setOpen(false); setSuggestions([]); touchingRef.current = false
    const { display } = formatSuggestion(item)
    onChange(display)
    onSelect({ lat: parseFloat(item.lat), lng: parseFloat(item.lon), display })
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
          placeholder={placeholder}
          style={{
            width: '100%', padding: '12px 40px 12px 14px', borderRadius: 12, boxSizing: 'border-box',
            background: 'var(--k-card2)',
            border: `1px solid ${confirmed ? 'rgba(0,200,150,0.5)' : open ? 'rgba(79,70,229,0.4)' : 'var(--k-border)'}`,
            color: 'var(--k-text)', fontSize: 14, outline: 'none', transition: 'border-color 0.2s',
            ...inputStyle,
          }}
        />
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          {loading
            ? <div style={{ width: 14, height: 14, border: '2px solid var(--k-border)', borderTopColor: 'var(--k-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            : confirmed
              ? <span style={{ color: 'var(--k-accent)', fontSize: 14 }}>✓</span>
              : <span style={{ color: 'var(--k-muted)', fontSize: 14 }}>🔍</span>}
        </div>
      </div>

      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 9999,
          background: 'var(--k-card)', border: '1px solid var(--k-border)',
          borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          maxHeight: 280, overflowY: 'auto',
        }}>
          {suggestions.map((s, i) => {
            const { main, secondary } = formatSuggestion(s)
            return (
              <button key={s.place_id} type="button"
                onMouseDown={e => e.preventDefault()}
                onTouchStart={() => { touchingRef.current = true }}
                onTouchEnd={() => handleSelect(s)}
                onClick={() => handleSelect(s)}
                style={{
                  width: '100%', textAlign: 'left', padding: '12px 14px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: i < suggestions.length - 1 ? '1px solid var(--k-border)' : 'none',
                  color: 'var(--k-text)', fontSize: 13,
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  WebkitTapHighlightColor: 'rgba(0,200,150,0.1)',
                }}
              >
                <span style={{ flexShrink: 0, marginTop: 2, fontSize: 14 }}>📍</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {main}
                  </div>
                  {secondary && (
                    <div style={{ fontSize: 11, color: 'var(--k-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {secondary}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
          <div style={{ padding: '6px 14px', borderTop: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 10, color: 'var(--k-muted)' }}>© OpenStreetMap contributors</span>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
