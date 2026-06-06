// OSM vector tile style via OpenFreeMap — tampilkan nama warung, gang, masjid, dll
export const OSM_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

// MapLibre GL style — Esri satellite + label overlay (untuk mitra/admin)
export const SATELLITE_STYLE = {
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© Esri',
    },
    labels: {
      type: 'raster',
      tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    { id: 'satellite', type: 'raster', source: 'satellite' },
    { id: 'labels',    type: 'raster', source: 'labels',    paint: { 'raster-opacity': 0.85 } },
  ],
}
