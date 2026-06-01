import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { incidentService } from '../api/incidentService'

/**
 * Custom hook to load, filter, and synchronize threat feed data based on active coordinates.
 */
export const useNearbyIncidents = () => {
  const { user, latitude, longitude, setIncidents } = useStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        let data
        if (latitude && longitude) {
          // Dynamic metric filter using PostGIS radius coordinates
          data = await incidentService.getNearbyIncidents(latitude, longitude, 20000) // 20km radius
        } else {
          // Global list fallback
          data = await incidentService.getAllIncidents()
        }
        
        if (data && data.length > 0) {
          setIncidents(data)
        }
      } catch (err: any) {
        console.warn('Backend API unreachable or offline. Operating in local sandbox simulation mode.', err)
        setError(err.message || 'API connection failure.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user, latitude, longitude, setIncidents])

  return { loading, error }
}
