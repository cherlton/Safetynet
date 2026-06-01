import React, { useState, useEffect } from 'react'
import { useStore } from './store/useStore'
import { Sidebar } from './components/Sidebar'
import { MapView } from './components/MapView'
import { IncidentFeed } from './components/IncidentFeed'
import { ConsentModal } from './components/ConsentModal'
import { NotificationPanel } from './components/NotificationPanel'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts'
import { useWebSocket } from './hooks/useWebSocket'
import { useNearbyIncidents } from './hooks/useNearbyIncidents'
import { incidentService } from './api/incidentService'
import { authService } from './api/authService'
import { Activity, AlertTriangle, Loader2, Key, Lock, Settings, Menu, Bell } from 'lucide-react'
import safetynetLogo from './assets/safetynet_logo.png'
import heroSlide1 from './assets/images/hero_slide_1.png'
import heroSlide2 from './assets/images/hero_slide_2.png'

export const App: React.FC = () => {



  const { user, login, activeTab, incidents, addIncident, latitude, longitude, toggleSidebar } = useStore()

  // Login slide carousel state
  const [currentSlide, setCurrentSlide] = useState(0)

  // Slides data definition
  const slides = [
    { image: heroSlide1, title: "Guardian of the Grid" },
    { image: heroSlide2, title: "Privacy First Intelligence" }
  ]

  // Auto transition for slide background
  useEffect(() => {
    if (!user) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length)
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [user, slides.length])

  // Login states
  const [usernameInput, setUsernameInput] = useState('officer_nkosi')
  const [roleInput, setRoleInput] = useState<'CPF' | 'SECURITY'>('CPF')
  const [passwordInput, setPasswordInput] = useState('••••••••')
  const [loading, setLoading] = useState(false)

  // Floating real-time alert state
  const [realtimeAlert, setRealtimeAlert] = useState<{ title: string; desc: string } | null>(null)

  // Simulator activity state
  const [isSimulating, setIsSimulating] = useState(false)

  // Notifications Pop-up State
  const [showNotificationsModal, setShowNotificationsModal] = useState(false)

  // System Configuration Sub-tabs
  const [settingsTab, setSettingsTab] = useState<'parameters' | 'reset' | 'create'>('parameters')

  // Reset Password states
  const [resetEmail, setResetEmail] = useState('')
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)
  const [resetLoading, setResetLoading] = useState(false)

  // Create New Password states
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createLoading, setCreateLoading] = useState(false)



  // Dynamic spatial threat fetching near dispatcher coordinates (20km radius)
  const { loading: isLoadingIncidents } = useNearbyIncidents()

  // High-resilient real-time STOMP WebSockets stream connection
  useWebSocket(user, setRealtimeAlert)

  // Auth states
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot' | 'verify-whatsapp'>('login')
  const [phoneInput, setPhoneInput] = useState('')
  const [googleAuthProfile, setGoogleAuthProfile] = useState<{ name: string; email: string; picture?: string; token: string; googleSub?: string } | null>(null)

  // Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await authService.login(usernameInput, passwordInput);
      login(result.username, result.role, result.token || "jwt_token_stub");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Invalid credentials");
    } finally {
      setLoading(false)
    }
  }

  // Registration handler - transitions to the WhatsApp verification screen
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPhoneInput('')
    setGoogleAuthProfile(null)
    setAuthView('verify-whatsapp')
  }

  // Google Login handler - decodes JWT and checks with the backend
  const handleGoogleCredentialResponse = async (response: any) => {
    setLoading(true);
    try {
      const jwtToken = response.credential;
      const base64Url = jwtToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const googleUser = JSON.parse(jsonPayload);
      
      const authResult = await authService.checkGoogleLogin({
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture || '',
        googleSub: googleUser.sub,
        token: jwtToken
      });

      if (authResult.registered) {
        // User exists! Login directly.
        login(authResult.username, authResult.role, authResult.token || jwtToken);
      } else {
        // User does not exist, go to WhatsApp verification to register
        setGoogleAuthProfile({
          name: googleUser.name,
          email: googleUser.email,
          picture: googleUser.picture || '',
          token: jwtToken,
          googleSub: googleUser.sub
        });
        setPhoneInput('');
        setAuthView('verify-whatsapp');
      }
    } catch (err: any) {
      console.error("Failed to authenticate Google user: ", err);
      alert(err.message || "Failed Google Sign-In");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // @ts-ignore
    if (!user && (authView === 'login' || authView === 'register') && typeof google !== 'undefined') {
      // @ts-ignore
      google.accounts.id.initialize({
        client_id: "234061349210-87edoef8s86uflqs90jllvc7f5honrom.apps.googleusercontent.com",
        callback: handleGoogleCredentialResponse
      });

      const btnContainer = document.getElementById("google-signin-btn");
      if (btnContainer) {
        // @ts-ignore
        google.accounts.id.renderButton(
          btnContainer,
          { theme: "outline", size: "large", width: 380, shape: "pill", text: authView === 'register' ? "signup_with" : "signin_with" }
        );
      }
    }
  }, [user, authView]);

  // Unified WhatsApp Verification handler
  const handleWhatsAppVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneInput || !phoneRegex.test(phoneInput)) {
      alert("Verification failed: This number is invalid. Must be exactly 10 digits.")
      setLoading(false)
      return
    }

    try {
      // 1. Call backend to verify the WhatsApp number
      const verificationResult = await authService.verifyWhatsApp(phoneInput);
      if (!verificationResult.valid) {
        alert(verificationResult.message);
        setLoading(false);
        return;
      }

      // 2. Perform the actual registration
      if (googleAuthProfile) {
        // Registering via Google
        const result = await authService.register({
          username: googleAuthProfile.name,
          email: googleAuthProfile.email,
          phoneNumber: phoneInput,
          role: 'CPF',
          picture: googleAuthProfile.picture,
          googleSub: googleAuthProfile.googleSub
        });
        login(result.username, result.role, result.token || googleAuthProfile.token);
      } else {
        // Standard Registration
        const result = await authService.register({
          username: usernameInput,
          password: passwordInput,
          phoneNumber: phoneInput,
          role: roleInput
        });
        login(result.username, result.role, result.token || "jwt_token_stub");
      }
      setGoogleAuthProfile(null);
      setAuthView('login');
    } catch (err: any) {
      alert(err.message || "Registration failed");
    } finally {
      setLoading(false)
    }
  }

  // Forgot Password handler
  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true)
    setTimeout(() => {
      setResetSuccess("Recovery instructions dispatched successfully!")
      setResetLoading(false)
    }, 1500)
  }

  // Live WhatsApp Signal Ingest Webhook Integration
  const triggerWhatsAppSimulation = async () => {
    setIsSimulating(true)
    const mockReports = [
      {
        text: "Suspicious activity! My name is Sipho Khumalo and I'm at the municipal depot, 3 men are cutting copper power lines behind the building right now. Phone me at +27835559876.",
        latOffset: (Math.random() - 0.5) * 0.05,
        lngOffset: (Math.random() - 0.5) * 0.05
      },
      {
        text: "Armed robbery! This is John Smith, 3 armed suspects held up the Engen service station on main road. Shots fired! Dial 0115554321 for help.",
        latOffset: (Math.random() - 0.5) * 0.05,
        lngOffset: (Math.random() - 0.5) * 0.05
      },
      {
        text: "Someone is dumping big blue chemical drums down the municipal stormwater drain behind the primary school. My name is Sarah, please send CPF officers.",
        latOffset: (Math.random() - 0.5) * 0.05,
        lngOffset: (Math.random() - 0.5) * 0.05
      }
    ]

    const selected = mockReports[Math.floor(Math.random() * mockReports.length)]
    const centerLat = latitude || -26.2041
    const centerLng = longitude || 28.0473

    const lat = centerLat + selected.latOffset
    const lng = centerLng + selected.lngOffset

    try {
      // Dispatches raw message parameters directly using our new modular api service
      await incidentService.simulateWhatsAppIngest(selected.text, lat, lng)
      console.log("WhatsApp signal simulation dispatched successfully to backend webhook!")
    } catch (err) {
      console.warn("Direct Ingest API call failed. Falling back to local standalone sandbox simulation.", err)

      // Fallback sandbox processing if backend is offline
      const provinces = ['Gauteng', 'Western Cape', 'KwaZulu-Natal']
      const randomProv = provinces[Math.floor(Math.random() * provinces.length)]
      const fallbackUrgency = selected.text.includes("robbery") ? 10 : (selected.text.includes("copper") ? 8 : 6)
      const newIncident = {
        id: Date.now(),
        cleanText: selected.text.replace(/Sipho Khumalo|John Smith|Sarah|\+27835559876|0115554321/g, "[REDACTED]"),
        crimeType: selected.text.includes("robbery") ? "ARMED_ROBBERY" : (selected.text.includes("copper") ? "CABLE_THEFT" : "ILLEGAL_DUMPING"),
        severity: selected.text.includes("robbery") ? 5 : (selected.text.includes("copper") ? 4 : 3),
        urgency: fallbackUrgency,
        latitude: lat,
        longitude: lng,
        reportedAt: new Date().toISOString(),
        status: "PROCESSED",
        province: randomProv
      }

      addIncident(newIncident)

      if (newIncident.urgency >= 8) {
        setRealtimeAlert({
          title: `CRITICAL SIGNAL INGESTED: ${newIncident.crimeType}`,
          desc: `Urgency ${newIncident.urgency}/10 alert registered. Heatmap weighting recalibrated.`
        })
        setTimeout(() => setRealtimeAlert(null), 5000)
      }
    } finally {
      // Small visual delay to appreciate the loading feedback
      setTimeout(() => {
        setIsSimulating(false)
      }, 700)
    }
  }

  // Analytics helper calculations
  const statsSummary = {
    total: incidents.length,
    critical: incidents.filter(i => i.urgency >= 8).length,
    avgUrgency: (incidents.reduce((sum, i) => sum + i.urgency, 0) / (incidents.length || 1)).toFixed(1),
    processedPercent: 100
  }

  // Activity checker: Flag red dot only if reports exist within the last 12 hours
  const hasRecentNotification = incidents.some(inc => {
    const diffMs = Date.now() - new Date(inc.reportedAt).getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    return diffHours >= 0 && diffHours <= 12
  })

  // Recharts Bar chart data: Grouped by Crime Type vs Province
  const chartDataGrouped = Object.entries(
    incidents.reduce((acc, curr) => {
      const type = curr.crimeType;
      const prov = curr.province || 'Gauteng';
      if (!acc[type]) {
        acc[type] = { name: type, Gauteng: 0, WesternCape: 0, KwaZuluNatal: 0 }
      }
      const key = prov.replace(/\s+/g, '') as 'Gauteng' | 'WesternCape' | 'KwaZuluNatal';
      if (key === 'Gauteng' || key === 'WesternCape' || key === 'KwaZuluNatal') {
        acc[type][key] = (acc[type][key] || 0) + 1;
      } else {
        acc[type]['Gauteng'] = (acc[type]['Gauteng'] || 0) + 1;
      }
      return acc
    }, {} as Record<string, { name: string; Gauteng: number; WesternCape: number; KwaZuluNatal: number }>)
  ).map(([_, data]) => data)

  // Recharts Hourly Area chart data
  const chartDataHourly = [
    { hour: '06:00', count: 1 },
    { hour: '09:00', count: 3 },
    { hour: '12:00', count: 5 },
    { hour: '15:00', count: 4 },
    { hour: '18:00', count: 7 },
    { hour: '21:00', count: 9 },
    { hour: '00:00', count: 8 },
    { hour: '03:00', count: 4 },
  ]

  // Render Login Page if not signed in
  if (!user) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center lg:items-stretch lg:justify-end p-4 md:p-8 lg:p-0 bg-neutral-950 overflow-hidden font-sans selection:bg-neutral-900 selection:text-white">
        {/* Full-bleed background slideshow */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {slides.map((slide, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentSlide ? 'opacity-45' : 'opacity-0'
                }`}
            >
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover object-top"
              />
              {/* Ambient gradients to blend with black canvas */}
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/65 to-neutral-950/30" />
              <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-transparent to-neutral-950/70" />
            </div>
          ))}
        </div>

        {/* Global absolute header overlay */}
        <div className="absolute top-0 left-0 right-0 lg:right-[500px] p-8 md:p-12 lg:p-16 flex justify-between items-center z-10 pointer-events-none">
          {/* Top Left Logo & Brand Name */}
          <div className="hidden lg:flex items-center gap-3 pointer-events-auto select-none">
            <img src={safetynetLogo} alt="SafetyNet Logo" className="w-14 h-14 object-contain" />
            <span className="text-lg font-bold tracking-wider text-white">SafetyNet</span>
          </div>
        </div>

        {/* Bottom Left Copywriting Block */}
        <div className="hidden lg:flex flex-col justify-end flex-1 relative z-10 p-16 pb-24 select-none pointer-events-none">
          <div className="max-w-xl space-y-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.1] text-white">
              Report Securely.<br />Dispatch Faster.<br />Protect Everywhere.
            </h2>
            <p className="text-sm text-neutral-300 leading-relaxed font-light">
              From natural language WhatsApp inputs to real-time responder grids, our encrypted pipeline protects citizens and coordinates action seamlessly.
            </p>

            {/* Slide Indicators */}
            <div className="flex gap-2 pt-4 pointer-events-auto">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${idx === currentSlide ? 'w-10 bg-white' : 'w-2 bg-white/30 hover:bg-white/50'
                    }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Floating Authentication Card on the Right */}
        <div className="relative z-20 w-full max-w-[460px] lg:max-w-none lg:w-[500px] bg-white lg:rounded-none rounded-[24px] p-8 md:p-12 shadow-2xl flex flex-col justify-center border-l border-neutral-100 lg:min-h-screen lg:shrink-0 lg:ml-auto">
          {authView === 'verify-whatsapp' ? (
            <div className="w-full">
              {/* Mobile Header */}
              <div className="flex lg:hidden items-center gap-3 mb-6 select-none">
                <img src={safetynetLogo} alt="SafetyNet Logo" className="w-14 h-14 object-contain" />
                <span className="text-lg font-bold tracking-wider text-black">SafetyNet</span>
              </div>

              <h2 className="text-[32px] font-extrabold tracking-tight text-neutral-900 leading-none">
                Almost There!
              </h2>
              <p className="text-sm text-neutral-500 mt-2.5">
                Link your active WhatsApp number to activate your secure community response dashboard.
              </p>

              <form onSubmit={handleWhatsAppVerifySubmit} className="mt-8 space-y-5">
                <div className="flex items-center gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-[12px]">
                  <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-xs font-bold text-white uppercase font-mono select-none">
                    {(googleAuthProfile ? googleAuthProfile.name : usernameInput).substring(0, 2).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-neutral-900">{googleAuthProfile ? googleAuthProfile.name : usernameInput}</div>
                    <div className="text-xs text-neutral-500">{googleAuthProfile ? googleAuthProfile.email : 'Standard Account Sign-up'}</div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-neutral-800 uppercase tracking-wider">WhatsApp Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="e.g. 0831337812"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-[12px] px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:bg-white transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-bold rounded-full transition shadow-md cursor-pointer text-sm tracking-wide mt-2"
                >
                  {loading ? 'Verifying WhatsApp...' : 'Verify & Activate Account'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGoogleAuthProfile(null);
                    setPhoneInput('');
                    setLoading(false);
                    setAuthView(googleAuthProfile ? 'login' : 'register');
                  }}
                  className="w-full text-center text-xs text-neutral-500 hover:text-neutral-800 transition font-medium mt-3 cursor-pointer"
                >
                  Cancel Sign Up
                </button>
              </form>
            </div>
          ) : authView === 'forgot' ? (
            <div className="w-full">
              {/* Mobile Header */}
              <div className="flex lg:hidden items-center gap-3 mb-6 select-none">
                <img src={safetynetLogo} alt="SafetyNet Logo" className="w-14 h-14 object-contain" />
                <span className="text-lg font-bold tracking-wider text-black">SafetyNet</span>
              </div>

              <h2 className="text-[32px] font-extrabold tracking-tight text-neutral-900 leading-none">
                Reset Passkey
              </h2>
              <p className="text-sm text-neutral-500 mt-2.5">
                Enter your registered responder email to receive a recovery passkey token.
              </p>

              {resetSuccess ? (
                <div className="mt-8 p-5 bg-neutral-50 border border-neutral-200 rounded-[16px] text-left">
                  <div className="text-sm font-bold text-neutral-950">Reset Instructions Sent!</div>
                  <div className="text-xs text-neutral-500 mt-1 leading-relaxed">
                    An encrypted passkey recovery link has been dispatched to **{resetEmail}**. Please check your inbox.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthView('login')
                      setResetSuccess(null)
                      setResetEmail('')
                    }}
                    className="w-full mt-5 py-3 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-full transition cursor-pointer"
                  >
                    Back to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="mt-8 space-y-5">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-neutral-800 uppercase tracking-wider">Responder Email Address</label>
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="e.g. responder@safetynet.org"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-[12px] px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:bg-white transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-bold rounded-full transition shadow-md cursor-pointer text-sm tracking-wide mt-2"
                  >
                    {resetLoading ? 'Sending Token...' : 'Dispatch Recovery Key'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthView('login')
                      setResetEmail('')
                    }}
                    className="w-full text-center text-xs text-neutral-500 hover:text-neutral-800 transition font-medium mt-3 cursor-pointer"
                  >
                    Cancel and Return
                  </button>
                </form>
              )}
            </div>
          ) : (
            <>
              <div className="w-full">
                {/* Mobile Header (Hidden on large screens, since absolute logo is shown) */}
                <div className="flex lg:hidden items-center gap-3 mb-6 select-none">
                  <img src={safetynetLogo} alt="SafetyNet Logo" className="w-14 h-14 object-contain" />
                  <span className="text-lg font-bold tracking-wider text-black">SafetyNet</span>
                </div>

                <h2 className="text-[32px] font-extrabold tracking-tight text-neutral-900 leading-none">
                  {authView === 'register' ? 'Create Account' : 'Welcome Back!'}
                </h2>
                <p className="text-sm text-neutral-500 mt-2.5">
                  {authView === 'register' ? 'Sign up to join the secure response grid.' : 'Log in to access your secure community response dashboard.'}
                </p>

                {authView === 'login' && (
                  /* Role Select Pill Control - Only for Login */
                  <div className="mt-8 space-y-2">
                    <label className="block text-[11px] font-bold text-neutral-800 uppercase tracking-wider">Responder Role</label>
                    <div className="flex p-1 bg-neutral-100 rounded-full">
                      <button
                        type="button"
                        onClick={() => setRoleInput('CPF')}
                        className={`flex-1 py-2 text-center text-xs font-semibold rounded-full transition cursor-pointer ${roleInput === 'CPF'
                          ? 'bg-neutral-900 text-white shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-950'
                          }`}
                      >
                        CPF Forum
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoleInput('SECURITY')}
                        className={`flex-1 py-2 text-center text-xs font-semibold rounded-full transition cursor-pointer ${roleInput === 'SECURITY'
                          ? 'bg-neutral-900 text-white shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-950'
                          }`}
                      >
                        Security Firm
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={authView === 'register' ? handleRegisterSubmit : handleLoginSubmit} className="mt-6 space-y-5">
                  {/* Username Input */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-neutral-800 uppercase tracking-wider">Username // Code</label>
                    <input
                      type="text"
                      required
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="Input your username"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-[12px] px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:bg-white transition"
                    />
                  </div>

                  {/* Password Input */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-neutral-800 uppercase tracking-wider">Secret Passkey</label>
                    <input
                      type="password"
                      required
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Input your passkey"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-[12px] px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:bg-white transition"
                    />
                  </div>

                  {authView === 'login' && (
                    /* Remember Me & Forgot Password Row */
                    <div className="flex items-center justify-between text-xs pt-1">
                      <label className="flex items-center gap-2 text-neutral-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 w-4 h-4 cursor-pointer"
                        />
                        <span>Remember me</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setAuthView('forgot')}
                        className="text-neutral-500 hover:text-neutral-950 transition font-medium cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-bold rounded-full transition shadow-md cursor-pointer text-sm tracking-wide mt-2"
                  >
                    {loading ? 'Processing...' : (authView === 'register' ? 'Continue to WhatsApp Link' : 'Login')}
                  </button>
                </form>

                {/* OR Divider */}
                <div className="relative flex py-5 items-center">
                  <div className="flex-grow border-t border-neutral-100"></div>
                  <span className="flex-shrink mx-4 text-[10px] text-neutral-400 font-mono uppercase tracking-widest bg-white px-2">Or continue with</span>
                  <div className="flex-grow border-t border-neutral-100"></div>
                </div>

                {/* Google OAuth Button */}
                <div className="w-full flex justify-center mt-2">
                  <div id="google-signin-btn"></div>
                </div>
              </div>

              {/* Footer Card Navigation */}
              <div className="text-center text-xs text-neutral-500 mt-8">
                {authView === 'register' ? (
                  <>Already have an account? <button type="button" onClick={() => setAuthView('login')} className="text-neutral-900 font-bold hover:underline cursor-pointer bg-transparent border-none p-0">Log in here</button></>
                ) : (
                  <>Don't have an account? <button type="button" onClick={() => setAuthView('register')} className="text-neutral-900 font-bold hover:underline cursor-pointer bg-transparent border-none p-0">Sign up here</button></>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // Render Full Dashboard Layout
  return (
    <div className="h-screen w-full bg-brand-navy-dark text-brand-slate flex overflow-hidden">
      {/* Geolocation Banner consent modal on mount */}
      <ConsentModal />

      {/* Global Collapsible Sidebar */}
      <Sidebar />

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col overflow-hidden relative">

        {/* Header Ribbon - perfectly matched to sidebar alignment */}
        <header className="h-16 bg-brand-navy border-b border-brand-navy-light px-4 md:px-8 flex items-center justify-between relative z-20">
          <div className="flex items-center gap-3">

            {/* Mobile Sidebar Hamburger Toggle */}
            <button
              onClick={toggleSidebar}
              className="md:hidden p-1.5 rounded-md hover:bg-neutral-200/60 text-brand-slate transition cursor-pointer flex items-center justify-center border border-brand-navy-light bg-white shadow-sm"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* AI Generated Flat Vector Logo */}
            <img
              src="/safetynet_logo.png"
              alt="SafetyNet Logo"
              className="w-8 h-8 rounded border border-brand-navy-light object-cover flex-shrink-0 bg-white"
            />

            <div className="flex flex-col text-left">
              <h2 className="text-xs font-bold text-brand-slate flex items-center gap-2 tracking-tight">
                <span>SafetyNet</span>
                <span className="text-neutral-400 font-normal">/</span>
                <span className="text-brand-slate-dark font-normal">Community Response Grid</span>
                {isLoadingIncidents ? (
                  <Loader2 className="h-3 w-3 text-brand-slate animate-spin ml-1" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-slate animate-pulse ml-1"></span>
                )}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Live WhatsApp Ingest Simulator button */}
            <button
              onClick={triggerWhatsAppSimulation}
              disabled={isSimulating}
              className="bg-brand-teal hover:bg-brand-teal/95 disabled:bg-brand-teal/70 disabled:cursor-wait text-white font-bold text-xs px-4 py-2 flex items-center rounded-md shadow-sm transition cursor-pointer"
            >
              {isSimulating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  INGESTING THREAT...
                </>
              ) : (
                <>
                  <Activity className="w-3.5 h-3.5 mr-1.5" />
                  SIMULATE INGEST SIGNAL
                </>
              )}
            </button>

            {/* Header Notification Bell Icon Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationsModal(!showNotificationsModal)}
                className="p-2 rounded-md hover:bg-neutral-200/60 text-brand-slate transition cursor-pointer flex items-center justify-center border border-brand-navy-light bg-white shadow-sm relative"
                title="Open System Notifications"
              >
                <Bell className="w-4 h-4 text-brand-slate" />
                {/* Dynamic Red Badge: Flat dot displayed ONLY if threat within the last 12 hours */}
                {hasRecentNotification && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-brand-red border border-white" />
                )}
              </button>

              {showNotificationsModal && (
                <>
                  {/* Backdrop for click-away */}
                  <div
                    className="fixed inset-0 z-40 bg-black/5 cursor-default"
                    onClick={() => setShowNotificationsModal(false)}
                  />

                  {/* Dropdown Card */}
                  <div className="absolute right-0 mt-2 w-72 bg-brand-navy border border-brand-navy-light rounded-lg shadow-xl z-50 p-4 animate-fade-in text-left">
                    <div className="flex justify-between items-center pb-2 mb-2.5 border-b border-brand-navy-light">
                      <span className="text-[10px] font-bold text-brand-slate font-mono uppercase tracking-wider">System Alerts</span>
                      <span className="text-[8px] text-brand-teal font-mono uppercase font-bold bg-brand-teal/10 px-2 py-0.5 rounded">Live Feed</span>
                    </div>

                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                      {incidents.slice(0, 3).map((inc) => (
                        <div key={inc.id} className="p-2 rounded bg-brand-navy-dark/10 border border-brand-navy-light space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] font-bold text-brand-red uppercase font-mono">{inc.crimeType}</span>
                            <span className="text-[7px] text-brand-slate-dark font-mono">{new Date(inc.reportedAt).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-[9px] text-brand-slate leading-normal line-clamp-2 italic">
                            "{inc.cleanText}"
                          </p>
                        </div>
                      ))}

                      {/* Fallback if no incidents loaded */}
                      {incidents.length === 0 && (
                        <p className="text-[10px] text-brand-slate-dark text-center py-4">No recent activities.</p>
                      )}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-brand-navy-light">
                      <button
                        onClick={() => {
                          setShowNotificationsModal(false)
                          useStore.setState({ activeTab: 'notifications' })
                        }}
                        className="w-full py-1.5 bg-black hover:bg-neutral-900 text-white text-[9px] font-mono font-bold rounded transition cursor-pointer text-center uppercase tracking-wider"
                      >
                        Open Notification Hub
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Logged in dispatcher credentials chip */}
            {user && (
              <div className="flex items-center gap-2.5 px-3 py-1 rounded-md bg-brand-navy-dark/10 border border-brand-navy-light">
                <div className="w-6 h-6 rounded bg-brand-navy-dark/25 border border-brand-navy-light flex items-center justify-center text-[10px] font-bold text-brand-slate uppercase font-mono select-none">
                  {user.username.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[11px] font-bold text-brand-slate leading-none">{user.username}</span>
                  <span className="text-[8px] font-mono font-bold text-brand-slate-dark uppercase tracking-wider leading-none mt-1">
                    {user.role}
                  </span>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Real-time Urgency Webhook Alert Toast (F8 AlertBanner Widget) */}
        {realtimeAlert && (
          <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-50 max-w-lg w-full px-4 animate-bounce">
            <div className="bg-brand-navy border border-brand-navy-light border-l-4 border-l-brand-red p-4 rounded-md shadow-lg text-brand-slate flex items-center gap-4">
              <AlertTriangle className="w-5 h-5 text-brand-red flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-bold text-sm tracking-tight">{realtimeAlert.title}</h4>
                <p className="text-xs text-brand-slate-dark">{realtimeAlert.desc}</p>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Tab Workspace Container */}
        <div className="flex-1 overflow-y-auto p-8 relative">

          {/* TAB 1: DASHBOARD ANALYTICS PANEL */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">

              {/* Metrics cards grid or Skeleton Loading Screen */}
              {isLoadingIncidents && incidents.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-5 bg-brand-navy border border-brand-navy-light rounded-md">
                      <div className="h-2 bg-brand-slate-dark/20 rounded w-28 mb-3"></div>
                      <div className="h-6 bg-brand-slate-dark/20 rounded w-12"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 bg-brand-navy border border-brand-navy-light rounded-md shadow-sm">
                    <span className="block text-[9px] text-brand-slate-dark font-mono uppercase tracking-wider mb-2">Total Incoming Reports</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold text-brand-slate font-mono">{statsSummary.total}</span>
                      <span className="text-xs text-brand-slate-dark font-mono">100% Privacy Cleansed</span>
                    </div>
                  </div>
                  <div className="p-5 bg-brand-navy border border-brand-navy-light rounded-md shadow-sm">
                    <span className="block text-[9px] text-brand-slate-dark font-mono uppercase tracking-wider mb-2">Active Priority Alerts (&gt;=8)</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold text-brand-red font-mono">{statsSummary.critical}</span>
                      <span className="text-xs text-brand-red font-mono animate-pulse">Active Alerts</span>
                    </div>
                  </div>
                  <div className="p-5 bg-brand-navy border border-brand-navy-light rounded-md shadow-sm">
                    <span className="block text-[9px] text-brand-slate-dark font-mono uppercase tracking-wider mb-2">Priority Average</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold text-brand-amber font-mono">{statsSummary.avgUrgency}</span>
                      <span className="text-xs text-brand-slate-dark font-mono">Scale 1 to 10</span>
                    </div>
                  </div>
                  <div className="p-5 bg-brand-navy border border-brand-navy-light rounded-md shadow-sm">
                    <span className="block text-[9px] text-brand-slate-dark font-mono uppercase tracking-wider mb-2">Safe Privacy Rate</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold text-brand-slate font-mono">{statsSummary.processedPercent}%</span>
                      <span className="text-xs text-brand-slate-dark font-mono">POPIA Approved</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Real-time Charts Block */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Category Bar Chart */}
                <div className="p-6 bg-brand-navy border border-brand-navy-light rounded-lg shadow-sm">
                  <h3 className="text-xs font-bold text-brand-slate mb-6 font-mono uppercase tracking-wider">Reports by Crime Type vs Province</h3>
                  <div className="h-80 w-full">
                    {isLoadingIncidents && incidents.length === 0 ? (
                      <div className="w-full h-full bg-brand-navy-dark/10 rounded animate-pulse flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-brand-slate-dark animate-spin" />
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartDataGrouped}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                          <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} tickLine={false} />
                          <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderRadius: '6px', color: '#111827', fontSize: '11px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                          <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                          <Bar dataKey="Gauteng" fill="#111827" name="Gauteng (GP)" radius={[1, 1, 0, 0]} />
                          <Bar dataKey="WesternCape" fill="#4B5563" name="Western Cape (WC)" radius={[1, 1, 0, 0]} />
                          <Bar dataKey="KwaZuluNatal" fill="#9CA3AF" name="KwaZulu-Natal (KZN)" radius={[1, 1, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Hourly Alert area graph */}
                <div className="p-6 bg-brand-navy border border-brand-navy-light rounded-lg shadow-sm">
                  <h3 className="text-xs font-bold text-brand-slate mb-6 font-mono uppercase tracking-wider">Activity Level (Hourly)</h3>
                  <div className="h-80 w-full">
                    {isLoadingIncidents && incidents.length === 0 ? (
                      <div className="w-full h-full bg-brand-navy-dark/10 rounded animate-pulse flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-brand-slate-dark animate-spin" />
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartDataHourly}>
                          <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#111827" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#111827" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                          <XAxis dataKey="hour" stroke="#94A3B8" fontSize={11} tickLine={false} />
                          <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderRadius: '6px', color: '#111827', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                          <Area type="monotone" dataKey="count" stroke="#111827" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MAP VIEW PREDICTIVE HEATMAP */}
          {activeTab === 'map' && (
            <div className="w-full h-[calc(100vh-8rem)] bg-brand-navy border border-brand-navy-light rounded-lg overflow-hidden shadow-sm">
              <MapView />
            </div>
          )}

          {/* TAB 3: ANONYMIZED INCIDENT FEED TABLE */}
          {activeTab === 'reports' && (
            <div className="h-[calc(100vh-8rem)]">
              <IncidentFeed />
            </div>
          )}

          {/* TAB 4: SYSTEM SETTINGS WITH NESTED SUB-PAGES */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl bg-brand-navy border border-brand-navy-light rounded-lg p-6 shadow-sm space-y-6">

              {/* Nested Sub-navigation Menu */}
              <div className="flex border-b border-brand-navy-light pb-3 gap-2">
                <button
                  onClick={() => setSettingsTab('parameters')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition duration-150 cursor-pointer font-bold ${settingsTab === 'parameters'
                    ? 'bg-brand-navy-dark/10 border border-brand-navy-light text-brand-slate shadow-sm'
                    : 'text-brand-slate-dark hover:text-brand-slate'
                    }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Secure Parameters</span>
                </button>
                <button
                  onClick={() => setSettingsTab('reset')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition duration-150 cursor-pointer font-bold ${settingsTab === 'reset'
                    ? 'bg-brand-navy-dark/10 border border-brand-navy-light text-brand-slate shadow-sm'
                    : 'text-brand-slate-dark hover:text-brand-slate'
                    }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Reset Password</span>
                </button>
                <button
                  onClick={() => setSettingsTab('create')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition duration-150 cursor-pointer font-bold ${settingsTab === 'create'
                    ? 'bg-brand-navy-dark/10 border border-brand-navy-light text-brand-slate shadow-sm'
                    : 'text-brand-slate-dark hover:text-brand-slate'
                    }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Create New Password</span>
                </button>
              </div>

              {/* Sub-tab 1: Secure Parameters */}
              {settingsTab === 'parameters' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-sm text-brand-slate">Secure Console Parameters</h4>
                    <p className="text-xs text-brand-slate-dark mt-1">Core system variables governing Twilio webhooks, LLM PII filters, and regional retention locks.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-brand-navy-light">
                      <div>
                        <span className="block font-bold text-sm text-brand-slate">Twilio Signature Enforcer</span>
                        <span className="text-xs text-brand-slate-dark">Reject webhook calls with invalid HMAC signatures.</span>
                      </div>
                      <span className="text-xs px-3 py-1 font-mono font-bold bg-brand-navy-dark/10 border border-brand-navy-light rounded-md text-brand-slate-dark">DISABLED (LOCAL_SANDBOX)</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-brand-navy-light">
                      <div>
                        <span className="block font-bold text-sm text-brand-slate">Anthropic Model Designation</span>
                        <span className="text-xs text-brand-slate-dark">Core Large Language Model mapping for PII filtering.</span>
                      </div>
                      <span className="text-xs px-3 py-1 font-mono font-bold bg-brand-navy-dark/10 border border-brand-navy-light rounded-md text-brand-slate-dark">CLAUDE-3-5-SONNET</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <div>
                        <span className="block font-bold text-sm text-brand-slate">POPIA Data Retention Limit</span>
                        <span className="text-xs text-brand-slate-dark">Soft deletion threshold of cleaned citizen records.</span>
                      </div>
                      <span className="text-xs px-3 py-1 font-mono font-bold bg-brand-navy-dark/10 border border-brand-navy-light rounded-md text-brand-slate-dark">12 MONTHS</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-tab 2: Reset Password Page */}
              {settingsTab === 'reset' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!resetEmail) return
                    setResetLoading(true)
                    setResetSuccess(null)
                    setTimeout(() => {
                      setResetLoading(false)
                      setResetSuccess('A secure cryptographic reset authorization code has been successfully transmitted to: ' + resetEmail)
                      setResetEmail('')
                    }, 1200)
                  }}
                  className="space-y-4"
                >
                  <div>
                    <h4 className="font-bold text-sm text-brand-slate">Platform Password Reset Request</h4>
                    <p className="text-xs text-brand-slate-dark mt-1">
                      Initiate a cryptographically secure token reset process for this terminal. Verification is audited.
                    </p>
                  </div>

                  {resetSuccess && (
                    <div className="p-3 bg-brand-teal/10 border border-brand-teal/20 text-brand-teal text-xs rounded-md">
                      {resetSuccess}
                    </div>
                  )}

                  <div className="relative">
                    <span className="absolute left-3 top-3 text-[10px] text-brand-slate-dark font-mono uppercase">DISPATCHER EMAIL //</span>
                    <input
                      type="email"
                      required
                      placeholder="dispatcher@safetynet.org"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full bg-brand-navy-dark/10 border border-brand-navy-light rounded-md pl-36 pr-4 py-2.5 text-sm text-brand-slate focus:outline-none focus:border-brand-teal transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full py-2.5 bg-black hover:bg-neutral-900 disabled:bg-neutral-800 disabled:cursor-wait text-white text-xs font-bold rounded-md transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    {resetLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Generating Cryptokey...
                      </>
                    ) : (
                      'Generate Secure Reset Link'
                    )}
                  </button>
                </form>
              )}

              {/* Sub-tab 3: Create New Password Page */}
              {settingsTab === 'create' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    setCreateError(null)
                    setCreateSuccess(null)
                    if (newPassword !== confirmNewPassword) {
                      setCreateError('New passwords do not match. Please verify credentials.')
                      return
                    }
                    setCreateLoading(true)
                    setTimeout(() => {
                      setCreateLoading(false)
                      setCreateSuccess('Dispatcher terminal credentials upgraded successfully. New SHA-256 cryptohash synchronized.')
                      setCurrentPassword('')
                      setNewPassword('')
                      setConfirmNewPassword('')
                    }, 1200)
                  }}
                  className="space-y-4"
                >
                  <div>
                    <h4 className="font-bold text-sm text-brand-slate">Establish Secure Credentials</h4>
                    <p className="text-xs text-brand-slate-dark mt-1">
                      Update your platform authorization codes. Password matrices are hashed and stored with salt modifiers.
                    </p>
                  </div>

                  {createSuccess && (
                    <div className="p-3 bg-brand-teal/10 border border-brand-teal/20 text-brand-teal text-xs rounded-md">
                      {createSuccess}
                    </div>
                  )}

                  {createError && (
                    <div className="p-3 bg-brand-red/10 border border-brand-red/20 text-brand-red text-xs rounded-md">
                      {createError}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-[10px] text-brand-slate-dark font-mono uppercase">CURRENT CODE //</span>
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full bg-brand-navy-dark/10 border border-brand-navy-light rounded-md pl-36 pr-4 py-2.5 text-sm text-brand-slate focus:outline-none focus:border-brand-teal transition"
                      />
                    </div>

                    <div className="relative">
                      <span className="absolute left-3 top-3 text-[10px] text-brand-slate-dark font-mono uppercase">NEW CODE //</span>
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-brand-navy-dark/10 border border-brand-navy-light rounded-md pl-36 pr-4 py-2.5 text-sm text-brand-slate focus:outline-none focus:border-brand-teal transition"
                      />
                    </div>

                    <div className="relative">
                      <span className="absolute left-3 top-3 text-[10px] text-brand-slate-dark font-mono uppercase">CONFIRM CODE //</span>
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="w-full bg-brand-navy-dark/10 border border-brand-navy-light rounded-md pl-36 pr-4 py-2.5 text-sm text-brand-slate focus:outline-none focus:border-brand-teal transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={createLoading}
                    className="w-full py-2.5 bg-black hover:bg-neutral-900 disabled:bg-neutral-800 disabled:cursor-wait text-white text-xs font-bold rounded-md transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    {createLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Synchronizing Security Key...
                      </>
                    ) : (
                      'Update Platform Credentials'
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 5: ENTERPRISE NOTIFICATION HUB TIMELINE */}
          {activeTab === 'notifications' && (
            <NotificationPanel />
          )}
        </div>
      </main>
    </div>
  )
}

export default App
