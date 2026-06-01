// Gateway config for local sandboxing and production routing
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

/**
 * Standard HTTP headers mapping
 */
export const getHeaders = (contentType = 'application/json') => {
  const headers: Record<string, string> = {
    'Content-Type': contentType,
  }
  
  // Optional secure JWT token injection placeholder
  const token = localStorage.getItem('safetynet_auth_token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  return headers
}
