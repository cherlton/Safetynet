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
      try {
        let data
        if (latitude && longitude) {
          data = await incidentService.getNearbyIncidents(latitude, longitude, 20000)
        } else {
          data = await incidentService.getAllIncidents()
        }
        
        if (data) {
          setIncidents(data)
        }
      } catch (err: any) {
        console.warn('Polling synchronization notice:', err.message)
        setError(err.message || 'API connection failure.')
      } finally {
        setLoading(false)
      }
    }

    // Initial load
    setLoading(true)
    loadData()

    // Auto-polling interval every 4 seconds for instant real-time live synchronization
    const pollInterval = setInterval(() => {
      loadData()
    }, 4000)

    return () => clearInterval(pollInterval)
  }, [user, latitude, longitude, setIncidents])

  return { loading, error }
}
