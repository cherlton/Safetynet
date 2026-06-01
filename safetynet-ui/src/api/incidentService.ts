import { API_BASE_URL, getHeaders } from './apiClient'
import type { Incident } from '../types'

/**
 * Handles all REST integrations with the Spring Boot SafetyNet backend
 */
export const incidentService = {
  /**
   * Fetches all processed anonymized incidents globally.
   */
  async getAllIncidents(): Promise<Incident[]> {
    const response = await fetch(`${API_BASE_URL}/api/incidents`, {
      method: 'GET',
      headers: getHeaders(),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch incidents. Server status: ${response.status}`)
    }
    return response.json()
  },

  /**
   * Performs high-precision PostGIS spatial radius queries centered on active dispatcher coordinates.
   */
  async getNearbyIncidents(lat: number, lng: number, radiusInMeters = 20000): Promise<Incident[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/incidents/nearby?lat=${lat}&lng=${lng}&radius=${radiusInMeters}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    )
    
    if (!response.ok) {
      throw new Error(`Failed to fetch nearby spatial incidents. Server status: ${response.status}`)
    }
    return response.json()
  },

  /**
   * Sends a simulated incoming citizen WhatsApp message directly to the backend webhook.
   */
  async simulateWhatsAppIngest(textMessage: string, latitude: number, longitude: number): Promise<void> {
    const formParams = new URLSearchParams()
    formParams.append('From', 'whatsapp:+27829999876')
    formParams.append('Body', textMessage)
    formParams.append('Latitude', latitude.toFixed(6))
    formParams.append('Longitude', longitude.toFixed(6))

    const response = await fetch(`${API_BASE_URL}/webhook/whatsapp`, {
      method: 'POST',
      headers: getHeaders('application/x-www-form-urlencoded'),
      body: formParams,
    })

    if (!response.ok) {
      throw new Error(`Failed to ingest WhatsApp simulation. Server status: ${response.status}`)
    }
  }
}
