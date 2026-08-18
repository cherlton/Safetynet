import React, { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useStore } from '../store/useStore'
import { Search, X, MapPin } from 'lucide-react'

// Leaflet fallback marker
const markerSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%230D9488" width="32px" height="32px"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`

const CustomMarkerIcon = L.icon({
  iconUrl: markerSvg,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
})

const RecenterMap: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], 13)
  }, [lat, lng, map])
  return null
}

// Google Maps Dark Cyber Style
const googleMapsDarkStyle: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#111827' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#111827' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9CA3AF' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#E5E7EB' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6B7280' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#064E3B' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1F2937' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#111827' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9CA3AF' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#374151' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1F2937' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1F2937' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#030712' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4B5563' }] }
]

export const MapView: React.FC = () => {
  const { latitude, longitude, incidents } = useStore()
  const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

  const defaultLat = latitude || -26.2041
  const defaultLng = longitude || 28.0473

  const [mapCenter, setMapCenter] = useState<[number, number]>([defaultLat, defaultLng])
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [googleLoaded, setGoogleLoaded] = useState(false)
  const [mapType, setMapType] = useState<'dark' | 'satellite'>('dark')

  const googleMapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const circlesRef = useRef<google.maps.Circle[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Pre-indexed key South African municipal sectors
  const locations = [
    { name: 'Sandton, Johannesburg, GP', coords: [-26.1076, 28.0567] as [number, number] },
    { name: 'Rosebank, Johannesburg, GP', coords: [-26.1438, 28.0416] as [number, number] },
    { name: 'Johannesburg CBD, GP', coords: [-26.2041, 28.0473] as [number, number] },
    { name: 'Melville, Johannesburg, GP', coords: [-26.1770, 28.0076] as [number, number] },
    { name: 'Soweto, Gauteng', coords: [-26.2678, 27.8585] as [number, number] },
    { name: 'Pretoria Central, Tshwane, GP', coords: [-25.7479, 28.1878] as [number, number] },
    { name: 'Cape Town Central, Western Cape', coords: [-33.9249, 18.4241] as [number, number] },
    { name: 'Durban Central, KwaZulu-Natal', coords: [-29.8587, 31.0218] as [number, number] }
  ]

  // Load Google Maps SDK dynamically if API Key is configured
  useEffect(() => {
    if (!googleMapsKey) return

    if (window.google && window.google.maps) {
      setGoogleLoaded(true)
      return
    }

    const existingScript = document.getElementById('google-maps-script')
    if (!existingScript) {
      const script = document.createElement('script')
      script.id = 'google-maps-script'
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsKey}&libraries=places,geometry`
      script.async = true
      script.defer = true
      script.onload = () => setGoogleLoaded(true)
      document.head.appendChild(script)
    } else {
      existingScript.addEventListener('load', () => setGoogleLoaded(true))
    }
  }, [googleMapsKey])

  // Initialize Google Maps instance
  useEffect(() => {
    if (!googleLoaded || !googleMapRef.current) return

    const map = new google.maps.Map(googleMapRef.current, {
      center: { lat: mapCenter[0], lng: mapCenter[1] },
      zoom: 13,
      styles: mapType === 'dark' ? googleMapsDarkStyle : undefined,
      mapTypeId: mapType === 'satellite' ? google.maps.MapTypeId.HYBRID : google.maps.MapTypeId.ROADMAP,
      disableDefaultUI: false,
      zoomControl: true,
      fullscreenControl: false,
      streetViewControl: true
    })

    mapInstanceRef.current = map

    // Google Places Autocomplete on search input
    if (searchInputRef.current && window.google && window.google.maps.places) {
      const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
        componentRestrictions: { country: 'za' },
        fields: ['geometry', 'name', 'formatted_address']
      })

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat()
          const lng = place.geometry.location.lng()
          setMapCenter([lat, lng])
          map.setCenter({ lat, lng })
          map.setZoom(14)
          setSearchQuery(place.formatted_address || place.name || '')
        }
      })
    }
  }, [googleLoaded, mapType])

  // Update Google Maps markers when incidents or center coordinates change
  useEffect(() => {
    if (!googleLoaded || !mapInstanceRef.current) return
    const map = mapInstanceRef.current

    // Pan map to updated center
    map.panTo({ lat: mapCenter[0], lng: mapCenter[1] })

    // Clear previous markers & circles
    markersRef.current.forEach(m => m.setMap(null))
    circlesRef.current.forEach(c => c.setMap(null))
    markersRef.current = []
    circlesRef.current = []

    // Center Radius Circle
    const centerCircle = new google.maps.Circle({
      strokeColor: '#0D9488',
      strokeOpacity: 0.8,
      strokeWeight: 1,
      fillColor: '#0D9488',
      fillOpacity: 0.05,
      map,
      center: { lat: mapCenter[0], lng: mapCenter[1] },
      radius: 5000
    })
    circlesRef.current.push(centerCircle)

    // Center Marker
    const centerMarker = new google.maps.Marker({
      position: { lat: mapCenter[0], lng: mapCenter[1] },
      map,
      title: 'Active Grid Center',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#0D9488',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2
      }
    })
    markersRef.current.push(centerMarker)

    // Render incident markers
    incidents.forEach(inc => {
      if (!inc.latitude || !inc.longitude) return

      const severityColors: Record<number, string> = {
        1: '#0D9488',
        2: '#3B82F6',
        3: '#FBBF24',
        4: '#F59E0B',
        5: '#EF4444'
      }
      const color = severityColors[inc.severity] || '#EF4444'

      const incidentCircle = new google.maps.Circle({
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 1,
        fillColor: color,
        fillOpacity: 0.18,
        map,
        center: { lat: inc.latitude, lng: inc.longitude },
        radius: 200 + (inc.severity * 80)
      })
      circlesRef.current.push(incidentCircle)

      const marker = new google.maps.Marker({
        position: { lat: inc.latitude, lng: inc.longitude },
        map,
        title: inc.crimeType,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 1.5
        }
      })

      const reporterBlock = inc.isAnonymous
        ? `<div style="font-size:10px; color:#9CA3AF; margin-bottom:6px;">🔒 Anonymous Citizen (POPIA Protected)</div>`
        : `<div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
             ${inc.reporterPicture ? `<img src="${inc.reporterPicture}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;" />` : ''}
             <strong style="font-size:11px; color:#111827;">${inc.reporterName || 'Verified Citizen'}</strong>
             <span style="font-size:10px; color:#4B5563;">(${inc.whatsappNumber || inc.reporterContact || ''})</span>
           </div>`

      const locationBlock = inc.reporterLocation
        ? `<div style="font-size:10px; color:#0D9488; font-weight:bold; margin-bottom:4px;">📍 ${inc.reporterLocation}</div>`
        : ''

      const infoContent = `
        <div style="padding:4px; max-width:240px; font-family:sans-serif; text-align:left;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-size:10px; font-weight:bold; color:#111827; text-transform:uppercase; background:#F3F4F6; padding:2px 6px; border-radius:4px;">${inc.crimeType.replace(/_/g, ' ')}</span>
            <span style="font-size:10px; font-weight:bold; color:#EF4444;">Priority: ${inc.urgency}/10</span>
          </div>
          ${locationBlock}
          ${reporterBlock}
          <div style="font-size:11px; font-style:italic; color:#374151; margin-bottom:6px; line-height:1.3;">"${inc.cleanText}"</div>
          <div style="font-size:9px; color:#9CA3AF;">Reported: ${new Date(inc.reportedAt).toLocaleTimeString()}</div>
        </div>
      `

      const infoWindow = new google.maps.InfoWindow({ content: infoContent })
      marker.addListener('click', () => infoWindow.open(map, marker))
      markersRef.current.push(marker)
    })
  }, [googleLoaded, mapCenter, incidents])

  const filteredSuggestions = searchQuery
    ? locations.filter(loc => loc.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : []

  const handleSelectLocation = (coords: [number, number], name: string) => {
    setMapCenter(coords)
    setSearchQuery(name)
    setShowSuggestions(false)
  }

  return (
    <div className="w-full h-full relative rounded-lg overflow-hidden border border-brand-navy-light shadow-sm bg-neutral-950">
      
      {/* Search & Layer Console */}
      <div className="absolute top-4 left-4 z-[1000] w-80 space-y-2">
        <div className="bg-white/95 backdrop-blur-sm border border-neutral-200 shadow-md p-1.5 rounded-md flex items-center gap-2">
          <Search className="w-4 h-4 text-neutral-400 ml-2" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search South African street or suburb..."
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
              className="p-1 hover:bg-neutral-100 rounded text-neutral-400 hover:text-neutral-600 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Suggestion Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && !googleLoaded && (
          <div className="absolute top-12 left-0 right-0 bg-white border border-neutral-200 rounded-md shadow-lg overflow-hidden mt-1 max-h-48 overflow-y-auto z-50">
            {filteredSuggestions.map((loc) => (
              <button
                key={loc.name}
                type="button"
                onClick={() => handleSelectLocation(loc.coords, loc.name)}
                className="w-full text-left px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50 hover:text-brand-slate font-semibold flex items-center gap-2 border-b border-neutral-100 last:border-b-0 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-brand-teal flex-shrink-0" />
                <span>{loc.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map Layer Switcher (Dark vs Satellite) */}
      <div className="absolute top-4 right-4 z-[1000] flex gap-1 bg-white/95 backdrop-blur-sm border border-neutral-200 p-1 rounded-md shadow-md">
        <button
          onClick={() => setMapType('dark')}
          className={`px-2.5 py-1 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
            mapType === 'dark' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          CYBER DARK
        </button>
        <button
          onClick={() => setMapType('satellite')}
          className={`px-2.5 py-1 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
            mapType === 'satellite' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          SATELLITE
        </button>
      </div>

      {/* Google Maps Container (if key is set) */}
      {googleMapsKey ? (
        <div ref={googleMapRef} className="w-full h-full" />
      ) : (
        /* Leaflet Interactive Fallback Container (if key not yet added) */
        <MapContainer 
          center={mapCenter} 
          zoom={13} 
          style={{ width: '100%', height: '100%', background: '#111827' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            maxZoom={20}
          />
          
          <RecenterMap lat={mapCenter[0]} lng={mapCenter[1]} />
          
          <Marker position={mapCenter} icon={CustomMarkerIcon}>
            <Popup>
              <div className="text-brand-slate font-bold">Active Grid Focus</div>
              <div className="text-xs text-gray-500">Center of live threat triage</div>
            </Popup>
          </Marker>
          
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

          {incidents.map((incident) => {
            if (!incident.latitude || !incident.longitude) return null
            const severityColors: Record<number, string> = {
              1: '#0D9488', 2: '#3B82F6', 3: '#FBBF24', 4: '#F59E0B', 5: '#EF4444'
            }
            const color = severityColors[incident.severity] || '#EF4444'

            return (
              <React.Fragment key={incident.id}>
                <Circle
                  center={[incident.latitude, incident.longitude]}
                  radius={200 + (incident.severity * 80)}
                  pathOptions={{
                    color,
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
                    <div className="p-1 max-w-xs text-brand-slate text-left">
                      <div className="flex justify-between items-center gap-4 mb-2">
                        <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-brand-navy-dark/10 border border-brand-navy-light text-brand-slate">
                          {incident.crimeType.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs font-semibold text-brand-red">
                          Priority: {incident.urgency}/10
                        </span>
                      </div>
                      {incident.reporterLocation && (
                        <div className="text-[10px] text-brand-teal font-bold mb-1">
                          📍 {incident.reporterLocation}
                        </div>
                      )}
                      {!incident.isAnonymous && incident.reporterName && (
                        <div className="text-[10px] text-brand-slate font-bold mb-1">
                          👤 {incident.reporterName} ({incident.whatsappNumber || incident.reporterContact || ''})
                        </div>
                      )}
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
      )}

      {/* Floating Coordinates Overlay */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-neutral-900/90 backdrop-blur-sm border border-neutral-800 px-4 py-2 rounded-md shadow-sm text-xs font-mono text-white">
        <span className="text-brand-teal font-bold">GOOGLE_GRID // </span>
        <span className="text-neutral-300">LAT: {mapCenter[0].toFixed(4)} | LNG: {mapCenter[1].toFixed(4)}</span>
      </div>
    </div>
  )
}
export default MapView
