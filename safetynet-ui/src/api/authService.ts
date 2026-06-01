import { API_BASE_URL, getHeaders } from './apiClient'

export interface AuthResponse {
  registered: boolean;
  username: string;
  email: string | null;
  role: 'CPF' | 'SECURITY';
  picture: string | null;
  token: string | null;
  message: string;
}

export const authService = {
  async register(params: {
    username: string;
    email?: string;
    password?: string;
    phoneNumber: string;
    role: 'CPF' | 'SECURITY';
    picture?: string;
    googleSub?: string;
  }): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Registration failed' }));
      throw new Error(errorData.message || 'Registration failed');
    }

    return response.json();
  },

  async login(usernameInput: string, passwordInput: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username: usernameInput, password: passwordInput }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(errorData.message || 'Invalid username or password');
    }

    return response.json();
  },

  async checkGoogleLogin(params: {
    email: string;
    name: string;
    picture: string;
    googleSub: string;
    token: string;
  }): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/google-login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Google authentication failed' }));
      throw new Error(errorData.message || 'Google authentication failed');
    }

    return response.json();
  },

  async verifyWhatsApp(phoneNumber: string): Promise<{ valid: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-whatsapp`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ phoneNumber }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Verification failed' }));
      throw new Error(errorData.message || 'Verification failed');
    }

    return response.json();
  }
}
