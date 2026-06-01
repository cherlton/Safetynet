import { useEffect } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useStore } from '../store/useStore'
import { API_BASE_URL } from '../api/apiClient'
import type { RealtimeAlert } from '../types'

/**
 * Custom hook to manage active STOMP WebSocket connections.
 * Automatically handles lifecycle connection and teardown events.
 */
export const useWebSocket = (
  user: any,
  onAlertTriggered: (alert: RealtimeAlert | null) => void
) => {
  const { addIncident } = useStore()

  useEffect(() => {
    if (!user) return

    // Establishes a fallback SockJS/STOMP bridge mapping our server broker
    const client = new Client({
      brokerURL: API_BASE_URL.replace(/^http/, 'ws') + '/ws-connect',
      webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws-connect`),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      
      onConnect: () => {
        console.log('STOMP Client successfully established WebSocket tunnel.')
        
        client.subscribe('/topic/incidents', (message) => {
          try {
            const newInc = JSON.parse(message.body)
            console.log('Real-time incident received over WS:', newInc)
            
            // Updates global Zustand state
            addIncident(newInc)

            // Trigger high-urgency notifications for the user
            if (newInc.urgency >= 8) {
              onAlertTriggered({
                title: `CRITICAL SIGNAL INGESTED: ${newInc.crimeType}`,
                desc: `Urgency ${newInc.urgency}/10 alert registered. Heatmap weighting recalibrated.`
              })
              setTimeout(() => onAlertTriggered(null), 5000)
            }
          } catch (e) {
            console.error('Failed to parse WebSocket JSON payload:', e)
          }
        })
      },
      onStompError: (frame) => {
        console.error('STOMP Broker connection failure: ' + frame.headers['message'])
      }
    })

    client.activate()

    // Automatically disconnects client when user logs out or leaves page
    return () => {
      client.deactivate()
      console.log('STOMP Client successfully closed connection tunnel.')
    }
  }, [user, addIncident, onAlertTriggered])
}
