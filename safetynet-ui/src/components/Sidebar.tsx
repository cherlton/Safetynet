import React from 'react'
import { useStore } from '../store/useStore'
import { 
  BarChart3, Map, FileText, Settings, LogOut,
  ChevronLeft, Menu, Bell
} from 'lucide-react'

export const Sidebar: React.FC = () => {
  const { logout, activeTab, setActiveTab, sidebarOpen, toggleSidebar } = useStore()

  // Functional navigation routes
  const navItems = [
    { id: 'dashboard' as const, label: 'Analytics Panel', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'map' as const, label: 'Predictive Heatmap', icon: <Map className="w-4 h-4" /> },
    { id: 'reports' as const, label: 'Anonymised Reports', icon: <FileText className="w-4 h-4" /> },
    { id: 'notifications' as const, label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'settings' as const, label: 'System Configuration', icon: <Settings className="w-4 h-4" /> }
  ]

  return (
    <>
      {/* Translucent Overlay for mobile/tablet when sidebar is open */}
      {sidebarOpen && (
        <div 
          onClick={toggleSidebar}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[900] md:hidden transition-opacity duration-300"
        />
      )}

      {/* Unified Sidebar Container */}
      <aside 
        className={`h-screen flex-shrink-0 transition-all duration-300 ease-in-out z-[950] ${
          sidebarOpen 
            ? 'w-52 bg-brand-navy border-r border-brand-navy-light flex flex-col justify-between py-6 px-4 fixed md:relative top-0 left-0 translate-x-0 shadow-2xl md:shadow-none' 
            : 'w-16 bg-[#18181B] border-r border-neutral-800 md:flex hidden flex-col justify-between items-center py-6 fixed md:relative top-0 left-0 -translate-x-full md:translate-x-0'
        }`}
      >
        {sidebarOpen ? (
          // =================== OPEN SIDEBAR STATE ===================
          <div className="flex flex-col justify-between h-full w-full">
            <div>
              {/* Sidebar Header with Collapse arrow */}
              <div className="pb-4 mb-4 border-b border-brand-navy-light flex items-center justify-between">
                <h3 className="font-bold text-sm text-brand-slate tracking-tight font-mono uppercase">Navigation</h3>
                <button
                  onClick={toggleSidebar}
                  title="Collapse Sidebar"
                  className="p-1 hover:bg-neutral-200/60 active:scale-95 rounded border border-brand-navy-light text-brand-slate-dark transition cursor-pointer flex items-center justify-center"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id)
                        // Auto-collapse sidebar on mobile after choosing a page
                        if (window.innerWidth < 768) {
                          toggleSidebar()
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-xs transition duration-150 cursor-pointer text-left ${
                        isActive
                          ? 'bg-white shadow-sm border border-brand-navy-light text-brand-slate font-bold'
                          : 'text-brand-slate-dark hover:text-brand-slate hover:bg-brand-navy-dark/5'
                      }`}
                    >
                      <span className={isActive ? 'text-brand-slate' : 'text-brand-slate-dark'}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>

            {/* Bottom Actions */}
            <div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold text-brand-red hover:bg-brand-red/10 transition cursor-pointer text-left"
              >
                <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          // =================== CLOSED SIDEBAR STATE ===================
          <div className="flex flex-col justify-between h-full items-center w-full">
            <div className="flex flex-col items-center gap-8 w-full">
              
              {/* Menu expand button */}
              <div className="relative group flex items-center justify-center w-full px-2">
                <button 
                  onClick={toggleSidebar}
                  className="w-9 h-9 rounded-md bg-neutral-800 flex items-center justify-center border border-neutral-700 text-white hover:bg-neutral-700/80 active:scale-95 transition cursor-pointer"
                >
                  <Menu className="w-4.5 h-4.5" />
                </button>
                <div className="absolute left-14 bg-neutral-900 border border-neutral-700 text-white text-[9px] font-mono uppercase tracking-wider px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 transform translate-x-2 group-hover:translate-x-0 z-50 whitespace-nowrap shadow-sm">
                  Expand Panel
                </div>
              </div>

              {/* Vertical Icons */}
              <nav className="flex flex-col gap-2.5 w-full px-2">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id
                  return (
                    <div key={item.id} className="relative group flex items-center justify-center w-full">
                      <button
                        onClick={() => {
                          setActiveTab(item.id)
                          toggleSidebar() // Expand the panel for easier page review
                        }}
                        className={`w-full aspect-square flex items-center justify-center rounded-md transition duration-150 cursor-pointer ${
                          isActive 
                            ? 'bg-neutral-800 text-white border border-neutral-700' 
                            : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800/40'
                        }`}
                      >
                        {item.icon}
                      </button>
                      
                      {/* Tooltip */}
                      <div className="absolute left-14 bg-neutral-900 border border-neutral-700 text-white text-[9px] font-mono uppercase tracking-wider px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 transform translate-x-2 group-hover:translate-x-0 z-50 whitespace-nowrap shadow-sm">
                        {item.label}
                      </div>
                    </div>
                  )
                })}
              </nav>
            </div>

            {/* Closed Sign Out Button */}
            <div className="relative group flex items-center justify-center w-full px-2">
              <button
                onClick={logout}
                className="w-9 h-9 rounded-md bg-neutral-800/20 hover:bg-brand-red/10 border border-neutral-800 hover:border-brand-red/20 text-neutral-500 hover:text-brand-red flex items-center justify-center transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
              <div className="absolute left-14 bg-neutral-900 border border-neutral-700 text-white text-[9px] font-mono uppercase tracking-wider px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 transform translate-x-2 group-hover:translate-x-0 z-50 whitespace-nowrap shadow-sm">
                Sign Out
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
export default Sidebar
