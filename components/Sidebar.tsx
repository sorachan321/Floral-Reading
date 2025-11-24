
import React from 'react';
import { Home, Book, Settings, FileText, Layers } from 'lucide-react';

interface SidebarProps {
  activeView: 'home' | 'reader';
  onNavigate: (view: 'home' | 'reader') => void;
  onSettingsClick: () => void;
  hasActiveBook: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, onSettingsClick, hasActiveBook }) => {
  return (
    <div className="w-16 h-full bg-[#f8f9fa] border-r border-slate-200 flex flex-col items-center py-6 flex-shrink-0 z-20">
      {/* Logo Area */}
      <div className="mb-8 select-none">
         <div className="text-2xl font-serif font-bold text-slate-300 hover:text-slate-500 transition-colors">
            FR
         </div>
      </div>

      {/* Navigation Icons */}
      <div className="flex-1 flex flex-col gap-6 w-full items-center">
        <button
          onClick={() => onNavigate('home')}
          className={`p-2 transition-all duration-200 relative group ${
            activeView === 'home'
              ? 'text-blue-600'
              : 'text-slate-400 hover:text-slate-600'
          }`}
          title="Library Home"
        >
          <Home size={24} strokeWidth={activeView === 'home' ? 2.5 : 2} />
          {activeView === 'home' && <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full" />}
        </button>

        {hasActiveBook && (
            <button
            onClick={() => onNavigate('reader')}
            className={`p-2 transition-all duration-200 relative group ${
                activeView === 'reader'
                ? 'text-blue-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            title="Continue Reading"
            >
            <Book size={24} strokeWidth={activeView === 'reader' ? 2.5 : 2} />
            {activeView === 'reader' && <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full" />}
            </button>
        )}

        <button
          className="p-2 text-slate-300 hover:text-slate-400 cursor-not-allowed"
          title="Collections (Coming Soon)"
        >
          <Layers size={24} strokeWidth={2} />
        </button>
      </div>

      {/* Bottom Actions */}
      <div className="mt-auto flex flex-col gap-6 items-center">
        <button
          onClick={onSettingsClick}
          className="p-2 text-slate-400 hover:text-slate-600 hover:rotate-90 transition-all duration-300"
          title="Settings"
        >
          <Settings size={24} />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
