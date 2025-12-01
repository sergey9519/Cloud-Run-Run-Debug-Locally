
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
    // APP SHELL: Uses bg-app (#F6F6FA) for that premium off-white feel
    <div className="flex h-screen bg-app font-sans text-ink-primary overflow-hidden selection:bg-primary selection:text-white">
      
      {/* Sidebar - Floating Surface */}
      <aside className="w-72 flex-shrink-0 hidden md:flex flex-col h-full border-r border-border-subtle bg-surface z-50 relative">
        <div className="h-20 flex items-center px-8">
          <div className="flex items-center gap-3 group cursor-default">
            <div className="w-9 h-9 bg-primary text-white rounded-lg flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform duration-500 ease-out">
                <Layers size={20} strokeWidth={2} />
            </div>
            <div>
                <span className="font-display font-semibold text-lg tracking-tight text-ink-primary block leading-none">Studio.</span>
                <span className="font-mono font-medium text-[10px] text-ink-tertiary uppercase tracking-widest block mt-1.5">OS v2.4</span>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 py-8 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="px-3 mb-4 text-[10px] font-bold text-ink-tertiary uppercase tracking-widest opacity-80">Operations</div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-subtle text-ink-primary shadow-sm'
                    : 'text-ink-secondary hover:bg-subtle/50 hover:text-ink-primary'
                }`
              }
            >
              <item.icon size={18} strokeWidth={2} className={`transition-colors duration-200 ${(({isActive}: any) => isActive ? 'text-primary' : 'text-ink-tertiary group-hover:text-ink-secondary')}`} />
              <span className="relative z-10 tracking-tight">{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="p-6 mx-2 mb-2 border-t border-border-subtle space-y-2">
           <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-ink-secondary hover:text-ink-primary hover:bg-subtle/50 transition-all">
                <Settings size={18} strokeWidth={2} />
                System
           </button>
           <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-ink-secondary hover:text-state-danger hover:bg-state-danger-bg transition-all">
                <LogOut size={18} strokeWidth={2} />
                Disconnect
           </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-surface/80 backdrop-blur-xl border-b border-border-subtle h-16 z-50 flex items-center px-6 justify-between">
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center">
                <Layers size={18} />
            </div>
            <span className="font-display font-semibold text-lg tracking-tight text-ink-primary">Studio.</span>
         </div>
         <button className="p-2 text-ink-tertiary"><Settings size={20}/></button>
      </div>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto overflow-x-hidden relative scroll-smooth -ml-[1px]">
        <div className="min-h-full pb-24 md:pb-12 pt-20 md:pt-0">
            <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
