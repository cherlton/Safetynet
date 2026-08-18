import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import { FolderOpen, X, MapPin, User, ShieldCheck, Phone, Check } from 'lucide-react'

export const IncidentFeed: React.FC = () => {
  const { incidents, setCoords, setActiveTab } = useStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState<number | 'ALL'>('ALL')
  const [selectedIncident, setSelectedIncident] = useState<typeof incidents[0] | null>(null)
  const [copied, setCopied] = useState(false)

  const filteredIncidents = incidents.filter((inc) => {
    const matchesSearch = inc.cleanText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.crimeType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inc.reporterName && inc.reporterName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inc.reporterLocation && inc.reporterLocation.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesSeverity = severityFilter === 'ALL' || inc.severity === severityFilter
    return matchesSearch && matchesSeverity
  })

  const getSeverityBadge = (level: number) => {
    const badges = {
      1: 'bg-brand-teal/10 text-brand-teal border border-brand-teal/20',
      2: 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20',
      3: 'bg-brand-amber/10 text-brand-amber border border-brand-amber/20',
      4: 'bg-orange-500/10 text-orange-600 border border-orange-500/20',
      5: 'bg-brand-red/10 text-brand-red border border-brand-red/20'
    } as const;
    return badges[level as keyof typeof badges] || badges[3];
  }

  const handleLocateOnMap = () => {
    if (selectedIncident && selectedIncident.latitude && selectedIncident.longitude) {
      setCoords(selectedIncident.latitude, selectedIncident.longitude)
      setActiveTab('map')
      setSelectedIncident(null)
    }
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Search & Filter Controls */}
      <div className="flex flex-col md:flex-row gap-3 p-4 bg-brand-navy border border-brand-navy-light rounded-lg shadow-sm">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-3 text-xs text-brand-slate-dark font-mono">SEARCH //</span>
          <input
            type="text"
            placeholder="Search keyword, location, crime type, or reporter..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-brand-navy-dark/10 border border-brand-navy-light rounded-md pl-20 pr-4 py-2.5 text-sm text-brand-slate focus:outline-none focus:border-brand-teal transition"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-brand-slate-dark font-mono uppercase">Danger:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="bg-brand-navy border border-brand-navy-light rounded-md px-4 py-2.5 text-sm text-brand-slate focus:outline-none focus:border-brand-teal cursor-pointer"
          >
            <option value="ALL">All Levels</option>
            <option value="1">Level 1 - Low</option>
            <option value="2">Level 2</option>
            <option value="3">Level 3 - Medium</option>
            <option value="4">Level 4 - High</option>
            <option value="5">Level 5 - Severe</option>
          </select>
        </div>
      </div>

      {/* Feed List Grid */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {filteredIncidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-brand-navy border border-dashed border-brand-navy-light rounded-lg">
            <FolderOpen className="w-8 h-8 text-brand-slate-dark mb-2" />
            <p className="text-brand-slate-dark text-xs">No reports found matching your filter criteria.</p>
          </div>
        ) : (
          filteredIncidents.map((incident) => {
            const isHighUrgency = incident.urgency >= 8
            return (
              <div
                key={incident.id}
                onClick={() => setSelectedIncident(incident)}
                className={`p-4 rounded-lg bg-brand-navy border border-brand-navy-light transition duration-150 hover:bg-brand-navy-dark/10 cursor-pointer flex flex-col md:flex-row justify-between md:items-center gap-4 ${
                  isHighUrgency 
                    ? 'border-l-4 border-l-brand-red shadow-sm' 
                    : ''
                }`}
              >
                {/* Left block info */}
                <div className="flex-1 space-y-1.5 text-left">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${getSeverityBadge(incident.severity)}`}>
                      {incident.crimeType.replace(/_/g, ' ')}
                    </span>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                      isHighUrgency 
                        ? 'bg-brand-red/10 text-brand-red border border-brand-red/20' 
                        : 'bg-brand-navy-dark/10 text-brand-slate-dark'
                    }`}>
                      PRIORITY: {incident.urgency}/10
                    </span>
                    <span className="text-[9px] text-brand-slate-dark font-mono">
                      {new Date(incident.reportedAt).toLocaleTimeString()}
                    </span>
                    {incident.reporterLocation && (
                      <span className="text-[9px] font-mono text-brand-teal flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {incident.reporterLocation.split(',')[0]}
                      </span>
                    )}
                  </div>
                  <p className="text-brand-slate text-sm font-medium line-clamp-2">
                    "{incident.cleanText}"
                  </p>
                </div>

                {/* Right Status / Reporter Tag */}
                <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap">
                  {incident.isAnonymous ? (
                    <span className="px-2.5 py-1 bg-black text-white text-[9px] font-mono font-bold rounded border border-neutral-800 uppercase tracking-wider">
                      🔒 ANONYMOUS
                    </span>
                  ) : (
                    <div className="relative group">
                      <div className="flex items-center gap-2 px-2.5 py-1 bg-brand-teal/10 border border-brand-teal/20 rounded cursor-pointer">
                        {incident.reporterPicture ? (
                          <img src={incident.reporterPicture} alt="avatar" className="w-4 h-4 rounded-full object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-brand-teal/20 border border-brand-teal/30 flex items-center justify-center text-[8px] font-bold text-brand-teal font-mono">
                            {(incident.reporterName || 'U').substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="text-[9px] font-bold text-brand-teal uppercase font-mono">
                          {incident.reporterName || "VERIFIED CITIZEN"}
                        </span>
                      </div>

                      {/* Hover Picture Preview Tooltip */}
                      {incident.reporterPicture && (
                        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:flex flex-col items-center z-50 pointer-events-none animate-fade-in">
                          <div className="bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl p-1.5 backdrop-blur-sm">
                            <img
                              src={incident.reporterPicture}
                              alt={incident.reporterName || 'Reporter'}
                              className="w-24 h-24 rounded-lg object-cover"
                            />
                            <div className="text-center mt-1.5 px-1">
                              <div className="text-[10px] font-bold text-white truncate max-w-[96px]">{incident.reporterName}</div>
                              <div className="text-[8px] text-neutral-400 font-mono">{incident.whatsappNumber || incident.reporterContact || ''}</div>
                            </div>
                          </div>
                          <div className="w-2.5 h-2.5 bg-neutral-900 border-r border-b border-neutral-700 rotate-45 -mt-1.5"></div>
                        </div>
                      )}
                    </div>
                  )}

                  <span className="text-xs font-bold text-brand-teal uppercase px-2 py-0.5 rounded bg-brand-teal/10">
                    {incident.status}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Details Frosted Center Pop-up Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-brand-navy border border-brand-navy-light shadow-2xl p-6 rounded-lg overflow-y-auto max-h-[90vh] flex flex-col justify-between text-left">
            <div>
              {/* Header */}
              <div className="flex justify-between items-center pb-4 border-b border-brand-navy-light mb-4">
                <div>
                  <h3 className="text-sm font-bold text-brand-slate font-mono uppercase tracking-wider">
                    Incident Report #{selectedIncident.id}
                  </h3>
                  <span className="text-[10px] text-brand-slate-dark font-mono">
                    {new Date(selectedIncident.reportedAt).toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="w-7 h-7 rounded-full bg-brand-navy-dark/10 hover:bg-brand-navy-dark/15 text-brand-slate flex items-center justify-center cursor-pointer border border-brand-navy-light"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Reporter Profile Section */}
              <div className="p-3 bg-brand-navy-dark/10 border border-brand-navy-light rounded-md mb-4">
                <span className="block text-[8px] text-brand-slate-dark font-mono uppercase mb-2">Reporter Credentials</span>
                {selectedIncident.isAnonymous ? (
                  <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
                    <ShieldCheck className="w-4 h-4 text-brand-teal" />
                    <span>POPIA Privacy Protection Active (Reporter chose to remain anonymous)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="relative group/modal">
                      {selectedIncident.reporterPicture ? (
                        <img src={selectedIncident.reporterPicture} alt="Avatar" className="w-9 h-9 rounded-full object-cover border border-brand-teal cursor-pointer" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-brand-teal/10 border border-brand-teal/30 flex items-center justify-center text-brand-teal font-bold font-mono text-xs cursor-pointer">
                          {(selectedIncident.reporterName || 'U').substring(0, 2).toUpperCase()}
                        </div>
                      )}

                      {/* Hover Picture Preview in Modal */}
                      {selectedIncident.reporterPicture && (
                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover/modal:flex flex-col items-center z-50 pointer-events-none animate-fade-in">
                          <div className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-2 backdrop-blur-sm">
                            <img
                              src={selectedIncident.reporterPicture}
                              alt={selectedIncident.reporterName || 'Reporter'}
                              className="w-32 h-32 rounded-lg object-cover"
                            />
                            <div className="text-center mt-2 px-1">
                              <div className="text-xs font-bold text-white">{selectedIncident.reporterName}</div>
                              <div className="text-[9px] text-neutral-400 font-mono mt-0.5">{selectedIncident.whatsappNumber || selectedIncident.reporterContact || ''}</div>
                            </div>
                          </div>
                          <div className="w-2.5 h-2.5 bg-neutral-900 border-r border-b border-neutral-700 rotate-45 -mt-1.5"></div>
                        </div>
                      )}
                    </div>

                    <div className="text-left">
                      <div className="text-xs font-bold text-brand-slate">{selectedIncident.reporterName || 'Verified Citizen'}</div>
                      <div className="text-[10px] text-brand-slate-dark font-mono flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-brand-teal" />
                        <span>{selectedIncident.whatsappNumber || selectedIncident.reporterContact || 'Contact Verified'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Badges details */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="p-2.5 bg-brand-navy-dark/10 border border-brand-navy-light rounded text-center">
                  <span className="block text-[8px] text-brand-slate-dark font-mono mb-0.5 uppercase">Category</span>
                  <span className="text-[10px] font-bold text-brand-teal uppercase">{selectedIncident.crimeType.replace(/_/g, ' ')}</span>
                </div>
                <div className="p-2.5 bg-brand-navy-dark/10 border border-brand-navy-light rounded text-center">
                  <span className="block text-[8px] text-brand-slate-dark font-mono mb-0.5 uppercase">Priority</span>
                  <span className="text-[10px] font-bold text-brand-red font-mono">{selectedIncident.urgency}/10</span>
                </div>
                <div className="p-2.5 bg-brand-navy-dark/10 border border-brand-navy-light rounded text-center">
                  <span className="block text-[8px] text-brand-slate-dark font-mono mb-0.5 uppercase">Danger</span>
                  <span className="text-[10px] font-bold text-brand-amber font-mono">{selectedIncident.severity}/5</span>
                </div>
              </div>

              {/* Witness Report Content */}
              <div className="space-y-1 mb-4">
                <span className="text-[10px] text-brand-slate-dark font-mono uppercase">Incident Description</span>
                <div className="p-3.5 rounded bg-brand-navy-dark/10 border border-brand-navy-light text-brand-slate text-xs leading-relaxed italic">
                  "{selectedIncident.cleanText}"
                </div>
              </div>

              {/* Attached Evidence Photo (if provided via WhatsApp) */}
              {selectedIncident.mediaUrl && (
                <div className="space-y-1 mb-4">
                  <span className="text-[10px] text-brand-slate-dark font-mono uppercase">Attached Scene Evidence / Photo</span>
                  <div className="p-2 rounded bg-brand-navy-dark/10 border border-brand-navy-light flex justify-center">
                    <img
                      src={selectedIncident.mediaUrl}
                      alt="Incident Evidence"
                      className="max-h-56 w-auto rounded-md object-contain border border-neutral-700 shadow-md"
                    />
                  </div>
                </div>
              )}

              {/* Physical Location details */}
              <div className="space-y-1 mb-4">
                <span className="text-[10px] text-brand-slate-dark font-mono uppercase">Physical Location & Coordinates</span>
                <div className="p-3 rounded bg-brand-navy-dark/10 border border-brand-navy-light space-y-2">
                  {selectedIncident.reporterLocation && (
                    <div className="text-xs text-brand-slate flex items-start gap-1.5 font-medium">
                      <MapPin className="w-4 h-4 text-brand-teal flex-shrink-0 mt-0.5" />
                      <span>{selectedIncident.reporterLocation}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-mono text-[10px] text-brand-slate-dark pt-1 border-t border-brand-navy-light">
                    <span>LAT: {selectedIncident.latitude ? selectedIncident.latitude.toFixed(6) : 'N/A'}</span>
                    <span>LNG: {selectedIncident.longitude ? selectedIncident.longitude.toFixed(6) : 'N/A'}</span>
                  </div>
                </div>
                
                <button
                  onClick={handleLocateOnMap}
                  disabled={!selectedIncident.latitude || !selectedIncident.longitude}
                  className="w-full mt-2.5 py-2.5 bg-black hover:bg-neutral-900 disabled:bg-neutral-800 disabled:cursor-not-allowed text-white text-xs font-bold rounded transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm font-mono uppercase tracking-wider"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Locate Incident on Live Map</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => setSelectedIncident(null)}
              className="w-full mt-2 py-2 bg-brand-navy-dark/10 hover:bg-brand-navy-dark/15 text-brand-slate text-[10px] font-bold rounded border border-brand-navy-light transition cursor-pointer uppercase font-mono tracking-wider"
            >
              Close Auditor
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
export default IncidentFeed
