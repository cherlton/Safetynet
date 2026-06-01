export interface User {
  username: string;
  role: 'CPF' | 'SECURITY';
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
}

export interface RealtimeAlert {
  title: string;
  desc: string;
}
