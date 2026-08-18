export interface User {
  username: string;
  role: 'CPF' | 'SECURITY';
  email?: string | null;
  phoneNumber?: string | null;
  picture?: string | null;
}

export interface Incident {
  id: number;
  cleanText: string;
  crimeType: string;
  severity: number;
  urgency: number;
  latitude: number | null;
  longitude: number | null;
  reportedAt: string;
  status: string;
  province?: string;
  reporterName?: string | null;
  reporterContact?: string | null;
  whatsappNumber?: string | null;
  reporterLocation?: string | null;
  isAnonymous?: boolean | null;
  reporterPicture?: string | null;
  mediaUrl?: string | null;
}

export interface RealtimeAlert {
  title: string;
  desc: string;
}

declare global {
  interface Window {
    google: any;
  }
  namespace google {
    namespace maps {
      type Map = any;
      type Marker = any;
      type Circle = any;
      type InfoWindow = any;
      type MapTypeStyle = any;
      const Map: any;
      const Marker: any;
      const Circle: any;
      const InfoWindow: any;
      const MapTypeId: any;
      const SymbolPath: any;
      namespace places {
        const Autocomplete: any;
      }
    }
  }
}
