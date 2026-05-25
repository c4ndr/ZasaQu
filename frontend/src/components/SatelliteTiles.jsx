import { TileLayer } from 'react-leaflet'

// Esri World Imagery (satelit) + Esri World Boundaries & Places (label jalan/nama tempat)
// Gratis, tanpa API key. Format tile: {z}/{y}/{x} (bukan {z}/{x}/{y})
export default function SatelliteTiles() {
  return (
    <>
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri"
        maxZoom={19}
      />
      <TileLayer
        url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
        attribution=""
        maxZoom={19}
        opacity={0.85}
      />
    </>
  )
}
