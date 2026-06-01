import { create } from 'zustand'
import type { User, Incident } from '../types'

interface AppState {
  user: User | null;
  token: string | null;
  latitude: number | null;
  longitude: number | null;
  locationConsentGranted: boolean | null;
  incidents: Incident[];
  activeTab: 'dashboard' | 'map' | 'reports' | 'notifications' | 'settings';
  sidebarOpen: boolean;
  
  // Actions
  login: (username: string, role: 'CPF' | 'SECURITY', token: string) => void;
  logout: () => void;
  setCoords: (lat: number, lng: number) => void;
  setConsentGranted: (granted: boolean) => void;
  addIncident: (incident: Incident) => void;
  setIncidents: (incidents: Incident[]) => void;
  setActiveTab: (tab: 'dashboard' | 'map' | 'reports' | 'notifications' | 'settings') => void;
  toggleSidebar: () => void;
}

export const useStore = create<AppState>((set) => {
  const storedUser = localStorage.getItem('safetynet_user');
  const storedToken = localStorage.getItem('safetynet_auth_token');
  
  let initialUser = null;
  if (storedUser) {
    try {
      initialUser = JSON.parse(storedUser);
    } catch (e) {
      console.error("Failed to parse stored user", e);
    }
  }

  return {
    user: initialUser,
    token: storedToken,
    latitude: null,
    longitude: null,
    locationConsentGranted: localStorage.getItem('safetynet_location_consent') === 'true' ? true : null,
    incidents: [],
    activeTab: (localStorage.getItem('safetynet_last_active_tab') as 'dashboard' | 'map' | 'reports' | 'notifications' | 'settings') || 'dashboard',
    sidebarOpen: true,

    login: (username, role, token) => {
      localStorage.setItem('safetynet_auth_token', token);
      localStorage.setItem('safetynet_user', JSON.stringify({ username, role }));
      set({ user: { username, role }, token });
    },
    logout: () => {
      localStorage.removeItem('safetynet_auth_token');
      localStorage.removeItem('safetynet_user');
      set({ user: null, token: null });
    },
    setCoords: (lat, lng) => set({ latitude: lat, longitude: lng }),
    setConsentGranted: (granted) => {
      localStorage.setItem('safetynet_location_consent', String(granted));
      set({ locationConsentGranted: granted });
    },
    addIncident: (incident) => set((state) => ({ incidents: [incident, ...state.incidents] })),
    setIncidents: (incidents) => set({ incidents }),
    setActiveTab: (tab) => {
      localStorage.setItem('safetynet_last_active_tab', tab);
      set({ activeTab: tab });
    },
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  };
})
