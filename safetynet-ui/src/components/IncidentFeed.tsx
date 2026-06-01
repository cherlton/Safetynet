import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import { FolderOpen, X, MapPin } from 'lucide-react'

export const IncidentFeed: React.FC = () => {
  const { incidents, setCoords, setActiveTab } = useStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState<number | 'ALL'>('ALL')
  const [selectedIncident, setSelectedIncident] = useState<typeof incidents[0] | null>(null)

  const filteredIncidents = incidents.filter((inc) => {
    const matchesSearch = inc.cleanText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.crimeType.toLowerCase().includes(searchTerm.toLowerCase())
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
            placeholder="Search keywords or crime type..."
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
            <p className="text-brand-slate-dark text-xs">No anonymised reports match current search criteria.</p>
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
                <div className="flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${getSeverityBadge(incident.severity)}`}>
                      {incident.crimeType}
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
                  </div>
                  <p className="text-brand-slate text-sm font-medium line-clamp-2">
                    "{incident.cleanText}"
                  </p>
                </div>

                {/* Status Indicator & Action */}
                <div className="flex items-center justify-between md:justify-end gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-brand-slate-dark font-mono">STATUS:</span>
                    <span className="text-xs font-bold text-brand-teal uppercase px-2 py-0.5 rounded bg-brand-teal/10">
                      {incident.status}
                    </span>
                  </div>

                  {/* Explicit Black Button indicating anonymous status BEFORE click */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedIncident(incident)
                    }}
                    className="px-3.5 py-2 bg-black hover:bg-neutral-900 text-white text-[10px] font-mono font-bold rounded border border-neutral-800 transition cursor-pointer flex items-center gap-2 shadow-sm uppercase tracking-wider"
                  >
                    <span>🔒 ANONYMOUS SENDER // AUDIT RECORD</span>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Details Frosted Center Pop-up Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-brand-navy-dark/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-brand-navy border border-brand-navy-light shadow-2xl p-6 rounded-lg overflow-y-auto max-h-[90vh] flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex justify-between items-center pb-4 border-b border-brand-navy-light mb-4">
                <h3 className="text-sm font-bold text-brand-slate font-mono uppercase tracking-wider">Privacy-Safe Incident Report</h3>
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="w-7 h-7 rounded-full bg-brand-navy-dark/10 hover:bg-brand-navy-dark/15 text-brand-slate flex items-center justify-center cursor-pointer border border-brand-navy-light"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Badges details */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="p-2.5 bg-brand-navy-dark/10 border border-brand-navy-light rounded text-center">
                  <span className="block text-[8px] text-brand-slate-dark font-mono mb-0.5 uppercase">Crime Category</span>
                  <span className="text-[10px] font-bold text-brand-teal uppercase">{selectedIncident.crimeType}</span>
                </div>
                <div className="p-2.5 bg-brand-navy-dark/10 border border-brand-navy-light rounded text-center">
                  <span className="block text-[8px] text-brand-slate-dark font-mono mb-0.5 uppercase">Priority Score</span>
                  <span className="text-[10px] font-bold text-brand-red font-mono">{selectedIncident.urgency}/10</span>
                </div>
                <div className="p-2.5 bg-brand-navy-dark/10 border border-brand-navy-light rounded text-center">
                  <span className="block text-[8px] text-brand-slate-dark font-mono mb-0.5 uppercase">Danger Level</span>
                  <span className="text-[10px] font-bold text-brand-amber font-mono">{selectedIncident.severity}/5</span>
                </div>
                <div className="p-2.5 bg-brand-navy-dark/10 border border-brand-navy-light rounded text-center">
                  <span className="block text-[8px] text-brand-slate-dark font-mono mb-0.5 uppercase">Reported At</span>
                  <span className="text-[10px] font-bold text-brand-slate font-mono">{new Date(selectedIncident.reportedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Anonymised text */}
              <div className="space-y-1 mb-4">
                <span className="text-[10px] text-brand-slate-dark font-mono uppercase">Anonymised Witness Report (Privacy Cleansed)</span>
                <div className="flex items-center space-x-2">
                  <div className="p-3.5 rounded bg-brand-navy-dark/10 border border-brand-navy-light text-brand-slate text-xs leading-relaxed italic flex-1">
                    "{selectedIncident.cleanText}"
                  </div>
                  {/* Copy button */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedIncident.cleanText || "");
                      // optional toast could be added
                    }}
                    className="px-2 py-1 bg-brand-teal/20 hover:bg-brand-teal/30 text-brand-teal text-xs rounded"
                  >
                    Copy
                  </button>
                  {/* Share button */}
                  <button
                    onClick={() => {
                      const shareData = {
                        title: "Incident Report",
                        text: selectedIncident.cleanText,
                        url: window.location.href,
                      };
                      if (navigator.share) {
                        navigator.share(shareData).catch((e) => console.error('Share failed', e));
                      } else {
                        // fallback: open WhatsApp/Twitter/Instagram share URLs
                        const encoded = encodeURIComponent(selectedIncident.cleanText);
                        const whatsappUrl = `https://wa.me/?text=${encoded}`;
                        window.open(whatsappUrl, '_blank');
                      }
                    }}
                    className="px-2 py-1 bg-brand-navy-dark/20 hover:bg-brand-navy-dark/30 text-brand-slate text-xs rounded"
                  >
                    Share
                  </button>
                </div>
              </div>

              {/* Coordinates info */}
              <div className="space-y-1 mb-4">
                <span className="text-[10px] text-brand-slate-dark font-mono uppercase">Map Location</span>
                <div className="p-2.5 rounded bg-brand-navy-dark/10 border border-brand-navy-light flex justify-between font-mono text-[10px]">
                  <span className="text-brand-slate-dark">LATITUDE:</span>
                  <span className="text-brand-teal">{selectedIncident.latitude ? selectedIncident.latitude.toFixed(6) : 'N/A'}</span>
                  <span className="text-brand-slate-dark">LONGITUDE:</span>
                  <span className="text-brand-teal">{selectedIncident.longitude ? selectedIncident.longitude.toFixed(6) : 'N/A'}</span>
                </div>
                
                {/* Black Map Navigation Button */}
                <button
                  onClick={handleLocateOnMap}
                  disabled={!selectedIncident.latitude || !selectedIncident.longitude}
                  className="w-full mt-2.5 py-2 bg-black hover:bg-neutral-900 disabled:bg-neutral-800 disabled:cursor-not-allowed text-white text-[10px] font-bold rounded transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm font-mono uppercase tracking-wider"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Locate Area on Heatmap</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => setSelectedIncident(null)}
              className="w-full mt-4 py-2 bg-brand-navy-dark/10 hover:bg-brand-navy-dark/15 text-brand-slate text-[10px] font-bold rounded border border-brand-navy-light transition cursor-pointer uppercase font-mono tracking-wider"
            >
              Close Secure Auditor
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
