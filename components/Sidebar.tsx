
import React, { useState, useEffect } from 'react';
import { Settings, RefreshCw, Key } from 'lucide-react';
import { MENU_ITEMS, COLORS } from '../constants';
import { MenuId } from '../types';

interface SidebarProps {
  activeMenu: MenuId;
  onMenuChange: (id: MenuId) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeMenu, onMenuChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const glassStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.4)',
    backdropFilter: 'blur(40px)',
    borderRight: '1px solid rgba(0, 136, 163, 0.1)',
  };

  return (
    <>
      <div 
        className={`h-screen flex flex-col z-[80] transition-all duration-500 fixed md:sticky top-0 ${
          isExpanded ? 'w-64' : 'w-24'
        }`}
        style={glassStyle}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div className="p-6 flex items-center justify-center h-24">
          <div className="w-12 h-12 bg-[#0088A3] rounded-2xl flex items-center justify-center shadow-lg shadow-[#0088A333]">
            <img 
              src="https://lh3.googleusercontent.com/d/1mk9IJ6hJleRZzWiuXaGCfuBuLRul4Xgj" 
              className="w-8 h-8 object-contain" 
              alt="Logo"
            />
          </div>
        </div>

        <nav className="flex-1 mt-8 px-4 space-y-4">
          {MENU_ITEMS.map((item) => {
            const isActive = activeMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onMenuChange(item.id)}
                className={`w-full flex items-center p-4 rounded-2xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-[#0088A3] text-white shadow-xl shadow-[#0088A322]' 
                    : 'text-[#003B47] hover:bg-[#0088A311]'
                }`}
              >
                <div className="shrink-0">{item.icon}</div>
                <div className={`ml-4 overflow-hidden transition-all duration-300 ${isExpanded ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'}`}>
                  <span className="text-sm font-black whitespace-nowrap uppercase tracking-wider">{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="p-4 mt-auto mb-8 space-y-2">
          <button 
            onClick={() => window.aistudio.openSelectKey()}
            className="w-full flex items-center p-4 rounded-2xl text-[#003B47] hover:bg-[#0088A311] transition-all"
          >
            <Key size={20} />
            <div className={`ml-4 overflow-hidden transition-all ${isExpanded ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'}`}>
              <span className="text-sm font-black uppercase tracking-wider">Reset AI Key</span>
            </div>
          </button>
          <button className="w-full flex items-center p-4 rounded-2xl text-[#003B47] hover:bg-[#0088A311] transition-all">
            <Settings size={20} />
            <div className={`ml-4 overflow-hidden transition-all ${isExpanded ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'}`}>
              <span className="text-sm font-black uppercase tracking-wider">Settings</span>
            </div>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
