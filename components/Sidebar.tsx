import React, { useState, useEffect } from 'react';
import { Settings, Menu, X } from 'lucide-react';
import { MENU_ITEMS, COLORS } from '../constants';
import { MenuId } from '../types';

interface SidebarProps {
  activeMenu: MenuId;
  onMenuChange: (id: MenuId) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeMenu, onMenuChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile sidebar on window resize if it goes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMenuClick = (id: MenuId) => {
    onMenuChange(id);
    setIsMobileOpen(false); // Auto-hide on mobile
  };

  const glassStyle: React.CSSProperties = {
    background: `
      radial-gradient(at 0% 0%, rgba(0, 136, 163, 0.25) 0px, transparent 55%),
      radial-gradient(at 100% 0%, rgba(190, 38, 144, 0.15) 0px, transparent 50%),
      radial-gradient(at 80% 40%, rgba(0, 59, 71, 0.12) 0px, transparent 40%),
      radial-gradient(at 20% 60%, rgba(190, 38, 144, 0.1) 0px, transparent 45%),
      radial-gradient(at 100% 100%, rgba(0, 136, 163, 0.2) 0px, transparent 50%),
      radial-gradient(at 0% 100%, rgba(0, 59, 71, 0.18) 0px, transparent 50%),
      radial-gradient(at 50% 50%, rgba(255, 255, 255, 0.1) 0px, transparent 60%),
      rgba(232, 251, 255, 0.85)
    `,
  };

  return (
    <>
      {/* Floating Trigger Icon (Mobile/Tablet only) */}
      <button 
        onClick={() => setIsMobileOpen(true)}
        className={`md:hidden fixed top-4 left-4 z-[60] p-2 transition-all duration-700 ease-in-out hover:scale-110 active:scale-90 ${
          isMobileOpen ? 'opacity-0 pointer-events-none -translate-x-12' : 'opacity-100 translate-x-0 bg-transparent'
        }`}
      >
        <img 
          src="https://lh3.googleusercontent.com/d/1mk9IJ6hJleRZzWiuXaGCfuBuLRul4Xgj" 
          className={`w-10 h-10 object-contain rounded-xl transition-transform duration-700 ${isMobileOpen ? 'rotate-[360deg]' : 'rotate-0'}`} 
          alt="Expand Menu"
        />
      </button>

      {/* Backdrop for Mobile */}
      <div 
        className={`md:hidden fixed inset-0 bg-[#003B47]/30 backdrop-blur-sm z-[70] transition-opacity duration-500 ${
          isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Sidebar Container */}
      <div 
        className={`h-screen flex flex-col z-[80] transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) rounded-r-[2.5rem] border-r border-white/40 backdrop-blur-3xl shadow-2xl md:shadow-none fixed md:sticky top-0 ${
          isMobileOpen ? 'translate-x-0 w-64' : 'max-md:-translate-x-full'
        } ${isExpanded ? 'md:w-64' : 'md:w-24'}`}
        style={glassStyle}
      >
        {/* Header - Advanced Spin-Glide Boundary Animation */}
        <div className="p-4 flex items-center justify-center h-24 overflow-hidden relative">
          <button 
            onClick={() => {
              if (window.innerWidth < 768) {
                setIsMobileOpen(false);
              } else {
                setIsExpanded(!isExpanded);
              }
            }}
            className="relative w-full h-16 flex items-center justify-center outline-none group"
          >
            {/* Square Icon: Spin & Glide (Desktop/Mobile Toggle) */}
            <div 
              className={`absolute transition-all duration-700 cubic-bezier(0.4, 0, 1, 1) flex items-center justify-center ${
                (isExpanded || (isMobileOpen && window.innerWidth < 768))
                  ? 'opacity-0 -translate-x-32 rotate-[720deg] scale-50' 
                  : 'opacity-100 translate-x-0 rotate-0 scale-100'
              }`}
            >
              <img 
                src="https://lh3.googleusercontent.com/d/1mk9IJ6hJleRZzWiuXaGCfuBuLRul4Xgj" 
                className="w-12 h-12 object-contain rounded-xl shadow-lg shadow-[#0088A311]" 
                alt="Logo Icon"
              />
            </div>

            {/* Full Logo: Reveals from Right */}
            <div 
              className={`absolute transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) flex items-center justify-center w-full px-4 ${
                (isExpanded || (isMobileOpen && window.innerWidth < 768))
                  ? 'opacity-100 translate-x-0 blur-0' 
                  : 'opacity-0 -translate-x-32 blur-sm'
              }`}
            >
              <img 
                src="https://lh3.googleusercontent.com/d/1jjkP3jH4DmIL8wtZNkYe0NDj6CLiaG5b" 
                className="h-12 w-auto object-contain max-w-full" 
                alt="Full Logo"
              />
            </div>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 mt-4 px-4 space-y-3">
          {MENU_ITEMS.map((item) => {
            const isActive = activeMenu === item.id;
            const expanded = isExpanded || isMobileOpen;
            return (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item.id)}
                className={`w-full group relative flex items-center p-3.5 rounded-2xl transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) outline-none active:scale-95 ${
                  isActive 
                    ? 'bg-[#0088A3] text-white' 
                    : 'text-gray-500 hover:text-[#003B47] hover:bg-white/30 hover:-translate-y-0.5'
                }`}
              >
                {!isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-0 bg-[#be2690] rounded-r-full transition-all duration-500 group-hover:h-8 group-hover:opacity-100 opacity-0" />
                )}

                <div className="relative flex items-center w-full z-10">
                  <div className="flex items-center">
                    <div className={`shrink-0 transition-all duration-500 transform ${isActive ? 'scale-110' : 'group-hover:scale-125 group-hover:rotate-[15deg]'}`}>
                      {item.icon}
                    </div>
                    
                    <div className={`transition-all duration-500 ease-in-out flex items-center overflow-hidden ${expanded ? 'max-w-xs opacity-100 ml-4 translate-x-0 blur-0' : 'max-w-0 opacity-0 ml-0 -translate-x-4 blur-sm'}`}>
                      <span className="text-sm font-bold tracking-tight whitespace-nowrap">{item.label}</span>
                    </div>
                  </div>
                </div>

                {!expanded && (
                  <div className="absolute left-full ml-6 px-4 py-2 bg-[#003B47] text-white text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 translate-x-4 group-hover:translate-x-0 z-[100] shadow-2xl border border-white/10 backdrop-blur-md">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Settings */}
        <div className="p-4 mt-auto mb-6">
          <button className="w-full flex items-center p-3.5 rounded-2xl text-gray-500 hover:text-[#0088A3] hover:bg-white/30 hover:-translate-y-0.5 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) group relative outline-none active:scale-95">
            <div className="relative shrink-0 z-10">
              <Settings size={22} className="group-hover:rotate-180 transition-transform duration-1000 ease-in-out" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#be2690] rounded-full border-2 border-white/50 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            
            <div className={`transition-all duration-500 ease-in-out flex items-center overflow-hidden z-10 ${ (isExpanded || isMobileOpen) ? 'max-w-xs opacity-100 ml-4 translate-x-0 blur-0' : 'max-w-0 opacity-0 ml-0 -translate-x-4 blur-sm'}`}>
              <span className="text-sm font-bold tracking-tight whitespace-nowrap">Settings</span>
            </div>

            {!(isExpanded || isMobileOpen) && (
              <div className="absolute left-full ml-6 px-4 py-2 bg-[#003B47] text-white text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 translate-x-4 group-hover:translate-x-0 z-[100] shadow-2xl border border-white/10 backdrop-blur-md">
                Settings
              </div>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;