import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useStore } from '../store/useStore'
import { Search, X, MapPin } from 'lucide-react'

// Direct SVG marker data URL matching our primary Cyber Teal color
const markerSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%230D9488" width="32px" height="32px"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`

const CustomMarkerIcon = L.icon({
  iconUrl: markerSvg,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
})

// Recenter component that updates leaflet map bounds reactively
const RecenterMap: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], 13)
  }, [lat, lng, map])
  return null
}

export const MapView: React.FC = () => {
  const { latitude, longitude, incidents } = useStore()

  // Fallback map center coordinates (Johannesburg Central, South Africa)
  const defaultLat = latitude || -26.2041
  const defaultLng = longitude || 28.0473

  // Map focus state
  const [mapCenter, setMapCenter] = useState<[number, number]>([defaultLat, defaultLng])
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Geographic Index for South African neighborhoods
  const locations = [
    { name: 'Sandton, Gauteng', coords: [-26.1076, 28.0567] as [number, number] },
    { name: 'Rosebank, Gauteng', coords: [-26.1438, 28.0416] as [number, number] },
    { name: 'Johannesburg CBD, Gauteng', coords: [-26.2041, 28.0473] as [number, number] },
    { name: 'Melville, Gauteng', coords: [-26.1770, 28.0076] as [number, number] },
    { name: 'Soweto, Gauteng', coords: [-26.2678, 27.8585] as [number, number] },
    { name: 'Cape Town Central, Western Cape', coords: [-33.9249, 18.4241] as [number, number] },
    { name: 'Durban Central, KwaZulu-Natal', coords: [-29.8587, 31.0218] as [number, number] },
    { name: 'Port Elizabeth, Eastern Cape', coords: [-33.9608, 25.6022] as [number, number] }
  ]

  // Filter suggestions
  const filteredSuggestions = searchQuery
    ? locations.filter(loc => loc.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : []

  const handleSelectLocation = (coords: [number, number], name: string) => {
    setMapCenter(coords)
    setSearchQuery(name)
    setShowSuggestions(false)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery) return
    const match = locations.find(loc => loc.name.toLowerCase().includes(searchQuery.toLowerCase()))
    if (match) {
      setMapCenter(match.coords)
    } else {
      // Direct spatial seed mapping fallback
      console.warn('Area not found in index, centering on default Johannesburg coordinates.')
    }
    setShowSuggestions(false)
  }

  return (
    <div className="w-full h-full relative rounded-lg overflow-hidden border border-brand-navy-light shadow-sm bg-brand-navy-dark">
      
      {/* Absolute Overlay: Area Search Console */}
      <div className="absolute top-4 left-4 z-[1000] w-80">
        <form 
          onSubmit={handleSearchSubmit}
          className="bg-white/95 backdrop-blur-sm border border-neutral-200 shadow-md p-1.5 rounded-md flex items-center gap-2"
        >
          <Search className="w-4 h-4 text-neutral-400 ml-2" />
          <input
            type="text"
            placeholder="Search address, suburb or province..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(true)}
            className="w-full bg-transparent text-xs text-brand-slate font-bold focus:outline-none py-1 placeholder-neutral-400"
          />
          {searchQuery && (
            <button 
              type="button"
              onClick={() => {
                setSearchQuery('')
                setShowSuggestions(false)
              }}
              className="p-1 hover:bg-neutral-100 rounded text-neutral-400 hover:text-neutral-600 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Suggestion Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute top-12 left-0 right-0 bg-white border border-neutral-200 rounded-md shadow-lg overflow-hidden mt-1 max-h-48 overflow-y-auto">
            {filteredSuggestions.map((loc) => (
              <button
                key={loc.name}
                type="button"
                onClick={() => handleSelectLocation(loc.coords, loc.name)}
                className="w-full text-left px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50 hover:text-brand-slate font-semibold flex items-center gap-2 border-b border-neutral-100 last:border-b-0"
              >
                <MapPin className="w-3.5 h-3.5 text-brand-teal flex-shrink-0" />
                <span>{loc.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <MapContainer 
        center={mapCenter} 
        zoom={13} 
        style={{ width: '100%', height: '100%', background: '#000000' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={20}
        />
        
        <RecenterMap lat={mapCenter[0]} lng={mapCenter[1]} />
        
        {/* User / Focused Center Position */}
        <Marker position={mapCenter} icon={CustomMarkerIcon}>
          <Popup>
            <div className="text-brand-slate font-bold">Grid Central Focus</div>
            <div className="text-xs text-gray-500">Radius of active community threat triage</div>
          </Popup>
        </Marker>
        
        {/* Dotted 5km coverage radius */}
        <Circle 
          center={mapCenter} 
          radius={5000} 
          pathOptions={{ 
            color: '#0D9488', 
            fillColor: '#0D9488', 
            fillOpacity: 0.03,
            weight: 1,
            dashArray: '6, 6'
          }}
        />

        {/* Heatmap representations & Incident Markers */}
        {incidents.map((incident) => {
          if (!incident.latitude || !incident.longitude) return null
          
          const severityColors = {
            1: '#0D9488', // Cyber Teal
            2: '#3B82F6', // Security Blue
            3: '#FBBF24', // Caution Gold
            4: '#F59E0B', // Warning Amber
            5: '#F87171'  // Crimson Pulse
          } as const;
          
          const color = severityColors[incident.severity as keyof typeof severityColors] || '#FBBF24'

          return (
            <React.Fragment key={incident.id}>
              {/* Highlight Circle for Heatmap effect */}
              <Circle
                center={[incident.latitude, incident.longitude]}
                radius={200 + (incident.severity * 80)}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.15,
                  weight: 1,
                  dashArray: '3, 3'
                }}
              />
              <Marker 
                position={[incident.latitude, incident.longitude]}
                icon={L.divIcon({
                  html: `<span class="flex h-3 w-3 relative"><span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style="background-color: ${color}"></span><span class="relative inline-flex rounded-full h-3 w-3" style="background-color: ${color}"></span></span>`,
                  className: 'custom-ping-icon',
                  iconSize: [12, 12],
                  iconAnchor: [6, 6]
                })}
              >
                <Popup>
                  <div className="p-1 max-w-xs text-brand-slate">
                    <div className="flex justify-between items-center gap-4 mb-2">
                      <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-brand-navy-dark/10 border border-brand-navy-light text-brand-slate">
                        {incident.crimeType}
                      </span>
                      <span className="text-xs font-semibold text-brand-red">
                        Priority: {incident.urgency}/10
                      </span>
                    </div>
                    <p className="text-sm italic mb-2">"{incident.cleanText}"</p>
                    <span className="text-[10px] text-brand-slate-dark">
                      Reported: {new Date(incident.reportedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          )
        })}
      </MapContainer>

      {/* Floating Center Coordinates Overlay */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-brand-navy border border-brand-navy-light px-4 py-2 rounded-md shadow-sm text-xs font-mono">
        <span className="text-brand-teal">MAP_INDEX // </span>
        <span className="text-brand-slate">LAT: {mapCenter[0].toFixed(4)} | LNG: {mapCenter[1].toFixed(4)}</span>
      </div>
    </div>
  )
}
export default MapView
