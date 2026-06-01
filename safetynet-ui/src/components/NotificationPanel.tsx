import React, { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { Bell, ShieldAlert, Key, UserCheck, AlertTriangle, Info } from 'lucide-react'

interface SystemNotification {
  id: string
  title: string
  description: string
  time: string
  category: 'threat' | 'security' | 'system'
  read: boolean
}

export const NotificationPanel: React.FC = () => {
  const { incidents } = useStore()
  const [permission, setPermission] = useState<NotificationPermission>('default')

  // Track real browser notifications permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const requestBrowserNotificationPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result === 'granted') {
        new Notification("SafetyNet Dispatch", {
          body: "Secure notification streaming has been successfully activated.",
          icon: "/safetynet_logo.png"
        })
      }
    } else {
      alert("This browser does not support native push notifications. In-App notifications will be utilized.")
    }
  }

  // Synthesize systemic events and incident reports into a unified activity feed
  const getSystemNotifications = (): SystemNotification[] => {
    const list: SystemNotification[] = []

    // 1. Seed dynamic logs from real simulated/seeded threats
    incidents.forEach((inc, index) => {
      list.push({
        id: `threat-${inc.id}-${index}`,
        title: `🚨 Threat Ingested: ${inc.crimeType}`,
        description: `Signal anonymised & mapped. Severity: ${inc.severity}/5. Reported: "${inc.cleanText.substring(0, 70)}..."`,
        time: new Date(inc.reportedAt).toLocaleTimeString(),
        category: 'threat',
        read: false
      })
    })

    // 2. Synthesize key dispatch & CPF operations logs
    list.push({
      id: 'sys-1',
      title: '👤 CPF Dispatcher Login',
      description: 'Active session initialized for officer_nkosi (CPF Sector Representative).',
      time: 'Just now',
      category: 'security',
      read: true
    })

    list.push({
      id: 'sys-2',
      title: '🔒 POPIA Redaction Engine Active',
      description: 'System automatically scrubbed 3 witness contact numbers and 2 names from incoming SMS stream.',
      time: '15 mins ago',
      category: 'security',
      read: true
    })

    list.push({
      id: 'sys-3',
      title: '⚙️ Leaflet Spatial Layer Configured',
      description: 'South African administrative boundaries and municipal sectors successfully cached locally.',
      time: '1 hour ago',
      category: 'system',
      read: true
    })

    list.push({
      id: 'sys-4',
      title: '🔑 Webhook Dispatcher Hooked',
      description: 'Spring Boot REST webhook validated and secured via signature verification.',
      time: '3 hours ago',
      category: 'system',
      read: true
    })

    return list
  }

  const notifications = getSystemNotifications()

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-6 overflow-y-auto max-h-[85vh]">
      
      {/* Dynamic Authorization Header Prompt */}
      {permission !== 'granted' && (
        <div className="p-5 bg-black border border-neutral-800 rounded-lg text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-brand-teal mt-0.5 flex-shrink-0" />
            <div className="space-y-1 text-left">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider">Enable Real-Time Dispatch Push Alerts</h4>
              <p className="text-xs text-neutral-400">
                Grant permission to receive instant pop-up signals and security dispatches even when SafetyNet is running in the background.
              </p>
            </div>
          </div>
          <button
            onClick={requestBrowserNotificationPermission}
            className="px-4 py-2 bg-brand-teal hover:bg-brand-teal/90 text-white text-xs font-mono font-bold rounded transition cursor-pointer self-start md:self-center uppercase tracking-wider"
          >
            Allow Native Alerts
          </button>
        </div>
      )}

      {/* Settings Panel & Permission Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Permission status card */}
        <div className="p-4 bg-brand-navy border border-brand-navy-light rounded-lg flex items-center gap-3 shadow-sm">
          <div className="p-2 bg-brand-navy-dark/10 rounded border border-brand-navy-light text-brand-slate">
            <Bell className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="block text-[9px] text-brand-slate-dark font-mono uppercase">System Alerts</span>
            <span className="text-xs font-bold text-brand-slate font-mono uppercase">
              {permission === 'granted' ? 'Native Push Enabled' : 'In-App Only'}
            </span>
          </div>
        </div>

        {/* POPIA Privacy audit state card */}
        <div className="p-4 bg-brand-navy border border-brand-navy-light rounded-lg flex items-center gap-3 shadow-sm">
          <div className="p-2 bg-brand-navy-dark/10 rounded border border-brand-navy-light text-brand-teal">
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="block text-[9px] text-brand-slate-dark font-mono uppercase">Privacy Engine</span>
            <span className="text-xs font-bold text-brand-teal font-mono uppercase">POPIA Secure</span>
          </div>
        </div>

        {/* Total Events Count card */}
        <div className="p-4 bg-brand-navy border border-brand-navy-light rounded-lg flex items-center gap-3 shadow-sm">
          <div className="p-2 bg-brand-navy-dark/10 rounded border border-brand-navy-light text-brand-amber">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="block text-[9px] text-brand-slate-dark font-mono uppercase">Dispatch Logs</span>
            <span className="text-xs font-bold text-brand-slate font-mono">{notifications.length} Registered</span>
          </div>
        </div>
      </div>

      {/* Main Notifications Timeline */}
      <div className="p-6 bg-brand-navy border border-brand-navy-light rounded-lg shadow-sm">
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-brand-navy-light">
          <h3 className="text-xs font-bold text-brand-slate font-mono uppercase tracking-wider">Live System Activity Feed</h3>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-teal animate-pulse"></span>
            <span className="text-[10px] text-brand-slate-dark font-mono">STREAMING IN REAL-TIME</span>
          </div>
        </div>

        <div className="space-y-4">
          {notifications.map((notif) => {
            const isThreat = notif.category === 'threat'
            const isSecurity = notif.category === 'security'
            return (
              <div 
                key={notif.id}
                className="p-3.5 rounded bg-brand-navy-dark/10 border border-brand-navy-light flex items-start gap-4 transition hover:bg-brand-navy-dark/15"
              >
                <div className={`p-2 rounded mt-0.5 flex-shrink-0 ${
                  isThreat 
                    ? 'bg-brand-red/10 text-brand-red border border-brand-red/20' 
                    : isSecurity 
                      ? 'bg-brand-teal/10 text-brand-teal border border-brand-teal/20' 
                      : 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20'
                }`}>
                  {isThreat ? (
                    <ShieldAlert className="w-4 h-4" />
                  ) : isSecurity ? (
                    <Key className="w-4 h-4" />
                  ) : (
                    <Info className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1 text-left space-y-0.5">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-xs font-bold text-brand-slate">{notif.title}</span>
                    <span className="text-[9px] text-brand-slate-dark font-mono whitespace-nowrap">{notif.time}</span>
                  </div>
                  <p className="text-xs text-brand-slate-dark leading-relaxed">
                    {notif.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
