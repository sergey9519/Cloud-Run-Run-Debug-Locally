
import React, { useState, useEffect } from 'react';
import { ArrowRight, Layers, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLogin: (contactInfo: string) => Promise<void>;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [showForceOption, setShowForceOption] = useState(false);

  useEffect(() => {
    // Cleaner effect logic: Only set timer if loading
    if (!loading) {
        return;
    }

    // Use window.setTimeout to enforce Browser return type (number) explicitly
    const timer = window.setTimeout(() => {
        setShowForceOption(true);
    }, 2500); // Show manual override if stuck for 2.5s

    return () => window.clearTimeout(timer);
  }, [loading]);

  const handleEnter = async (isForce = false) => {
    setLoading(true);
    setShowForceOption(false);
    try {
        // If forced, use the magic bypass string to skip network checks
        const loginEmail = isForce ? 'FORCE_OFFLINE' : 'alice@studio.com';
        await onLogin(loginEmail);
    } catch (e) {
        // If onLogin throws, stop loading
        setLoading(false);
        // Re-show force option immediately if it failed (likely re-throw from App.tsx)
        setTimeout(() => setShowForceOption(true), 200);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center items-center relative overflow-hidden font-sans selection:bg-ink selection:text-white">
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#E2E8F0_1px,transparent_1px)] [background-size:32px_32px] opacity-40 pointer-events-none"></div>
      
      {/* Decorative Blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white rounded-full blur-3xl opacity-60 pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center animate-enter">
        <div className="flex items-center gap-3 mb-16">
            <h1 className="text-6xl font-semibold tracking-tighter text-ink">Studio.</h1>
            <div className="w-20 h-20 bg-ink text-white rounded-3xl flex items-center justify-center shadow-elevation transition-transform duration-500 hover:scale-105 cursor-default">
                <div className="w-5 h-5 bg-white rounded-full shadow-sm"></div>
            </div>
        </div>
        
        <button
          onClick={() => handleEnter(false)}
          disabled={loading}
          className="group relative px-12 py-4 bg-ink text-white rounded-xl text-[11px] font-bold uppercase tracking-[0.25em] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 disabled:translate-y-0 disabled:shadow-none min-w-[200px]"
        >
          <span className="flex items-center justify-center gap-3">
            {loading ? (
                <span className="animate-pulse">Authenticating...</span>
            ) : (
                <>Enter <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 -ml-2 group-hover:ml-0" /></>
            )}
          </span>
        </button>

        {/* Emergency Bypass for "Stuck" State */}
        {showForceOption && (
            <button 
                onClick={() => handleEnter(true)} 
                className="mt-6 flex items-center gap-2 text-xs text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-4 py-2 rounded-lg transition-colors font-medium animate-in fade-in slide-in-from-top-2"
            >
                <AlertCircle size={14}/> Force Offline Entry
            </button>
        )}
      </div>
      
      <div className="absolute bottom-12 flex flex-col items-center gap-2 opacity-30">
        <div className="h-8 w-px bg-ink"></div>
        <span className="text-[9px] font-bold text-ink uppercase tracking-widest">System Ready</span>
      </div>
    </div>
  );
};

export default Login;
