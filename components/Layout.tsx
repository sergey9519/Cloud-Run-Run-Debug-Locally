import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Users, Calendar, Briefcase, Settings, Upload, LogOut, Layers, LayoutGrid, Sparkles, Palette } from 'lucide-react';

const Layout: React.FC = () => {
  const navItems = [
    { icon: LayoutGrid, label: 'Dashboard', path: '/' },
    { icon: Briefcase, label: 'Projects', path: '/projects' },
    { icon: Sparkles, label: 'Studio', path: '/studio' },
    { icon: Palette, label: 'Moodboard', path: '/moodboard' },
    { icon: Users, label: 'Roster', path: '/freelancers' },
    { icon: Calendar, label: 'Schedule', path: '/assignments' },
    { icon: Upload, label: 'Import', path: '/imports' },
  ];

  return (
    <div className="flex h-screen bg-app font-sans text-ink-primary overflow-hidden selection:bg-primary selection:text-white">
      
      {/* Sidebar - Floating Porcelain Layer */}
      <aside className="w-72 flex-shrink-0 hidden md:flex flex-col h-full border-r border-border-subtle bg-surface/80 backdrop-blur-xl z-50 relative">
        <div className="h-24 flex flex-col justify-center px-8">
          <div className="flex items-center gap-3 group cursor-default">
            <div className="flex flex-col">
                <span className="font-display font-bold text-xl tracking-tight text-ink-primary leading-none">Studio.</span>
                <span className="font-mono font-semibold text-[9px] text-ink-tertiary uppercase tracking-[0.2em] mt-1.5 opacity-80 group-hover:opacity-100 transition-opacity">Pro v2.4</span>
            </div>
            <div className="relative w-8 h-8 bg-ink-primary text-white rounded-lg flex items-center justify-center shadow-card group-hover:shadow-glow transition-all duration-500 ease-out group-hover:-translate-y-0.5 flex-shrink-0 ml-auto">
                <div className="absolute inset-0 bg-rival-gradient opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-500"></div>
                <div className="w-2 h-2 bg-white rounded-full shadow-sm relative z-10"></div>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="px-4 mb-4 text-[10px] font-bold text-ink-tertiary uppercase tracking-widest opacity-60">Operations</div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group relative ${
                  isActive
                    ? 'bg-subtle text-ink-primary shadow-sm'
                    : 'text-ink-secondary hover:bg-subtle/50 hover:text-ink-primary'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={18} strokeWidth={2} className={`transition-all duration-300 ${isActive ? 'text-primary scale-105' : 'text-ink-tertiary group-hover:text-ink-primary'}`} />
                  <span className={`relative z-10 tracking-tight transition-transform duration-300 ${isActive ? 'translate-x-0.5' : ''}`}>{item.label}</span>
                  {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>}
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="p-6 mx-2 mb-2 border-t border-border-subtle/50 space-y-1">
           <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-ink-secondary hover:text-ink-primary hover:bg-subtle/50 transition-all group">
                <Settings size={18} strokeWidth={2} className="group-hover:rotate-45 transition-transform duration-500"/>
                System Config
           </button>
           <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-ink-secondary hover:text-state-danger hover:bg-state-danger-bg/30 transition-all group">
                <LogOut size={18} strokeWidth={2} className="group-hover:-translate-x-0.5 transition-transform"/>
                Disconnect
           </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-surface/90 backdrop-blur-xl border-b border-border-subtle h-16 z-50 flex items-center px-6 justify-between">
         <div className="flex items-center gap-2">
            <span className="font-display font-bold text-lg tracking-tight text-ink-primary">Studio.</span>
            <div className="w-8 h-8 bg-ink-primary text-white rounded-lg flex items-center justify-center shadow-sm">
                <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
         </div>
         <button className="p-2 text-ink-tertiary"><Settings size={20}/></button>
      </div>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto overflow-x-hidden relative scroll-smooth">
        <div className="min-h-full pb-24 md:pb-12 pt-20 md:pt-0">
            <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;