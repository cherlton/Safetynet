import React from 'react'
import { useStore } from '../store/useStore'

export const ConsentModal: React.FC = () => {
  const { locationConsentGranted, setConsentGranted, setCoords } = useStore()

  if (locationConsentGranted !== null) return null

  const handleGrantConsent = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setCoords(latitude, longitude)
          setConsentGranted(true)
        },
        (error) => {
          console.warn("Geolocation access denied or timed out:", error.message)
          // Fallback to Johannesburg center
          setCoords(-26.2041, 28.0473)
          setConsentGranted(false)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    } else {
      // Browser doesn't support geolocation, fallback to JHB
      setCoords(-26.2041, 28.0473)
      setConsentGranted(false)
    }
  }

  const handleDecline = () => {
    // Default to Johannesburg
    setCoords(-26.2041, 28.0473)
    setConsentGranted(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy-dark/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative max-w-md w-full bg-brand-navy border border-brand-navy-light rounded-lg p-6 shadow-glass text-center">
        {/* Pulsing Signal Animation */}
        <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-brand-teal/15 border border-brand-teal/20 mb-6">
          <div className="relative w-2.5 h-2.5 rounded-full bg-brand-teal">
            <div className="absolute inset-0 rounded-full bg-brand-teal animate-ping opacity-75"></div>
          </div>
        </div>

        <h3 className="text-xl font-bold text-brand-slate mb-2">Enable Live Threat Mapping?</h3>
        <p className="text-brand-slate-dark text-sm leading-relaxed mb-6">
          SafetyNet uses your location to center the real-time crime predictive heatmap around your current area. 
          Your exact location is <strong>never stored</strong> on our servers and is processed exclusively inside your browser to protect your privacy.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleGrantConsent}
            className="w-full py-2.5 px-4 bg-brand-teal hover:bg-brand-teal/95 text-white font-semibold rounded-md transition duration-150 cursor-pointer"
          >
            Grant Location Consent
          </button>
          
          <button
            onClick={handleDecline}
            className="w-full py-2.5 px-4 bg-brand-navy-dark/10 hover:bg-brand-navy-dark/15 text-brand-slate-dark border border-brand-navy-light font-medium rounded-md transition duration-150 cursor-pointer"
          >
            Decline & Use Default City (Johannesburg)
          </button>
        </div>
      </div>
    </div>
  )
}
