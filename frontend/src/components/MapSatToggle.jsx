export default function MapSatToggle({ mapType, onToggle, style = {} }) {
  const isSat = mapType === 'hybrid'
  return (
    <button
      onClick={onToggle}
      style={{
        position: 'absolute', bottom: 8, left: 8, zIndex: 5,
        padding: '5px 10px', borderRadius: 8, border: 'none',
        background: isSat ? 'rgba(0,200,150,0.85)' : 'rgba(12,12,22,0.82)',
        backdropFilter: 'blur(8px)',
        color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        transition: 'background 0.2s',
        ...style,
      }}
    >
      {isSat ? '🗺️ Peta' : '🛰️ Satelit'}
    </button>
  )
}
