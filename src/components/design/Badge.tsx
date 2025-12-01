
import React from 'react';
import { Sparkles } from 'lucide-react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'ai';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'neutral',
  className = '' 
}) => {
  const styles = {
    neutral: "bg-subtle text-ink-secondary border-transparent",
    success: "bg-state-success-bg text-state-success border-state-success/20",
    warning: "bg-state-warning-bg text-state-warning border-state-warning/20",
    danger: "bg-state-danger-bg text-state-danger border-state-danger/20",
    
    // The "Dangerous Cousin" AI Chip
    // Uses the tint background, primary text, but a sharp teal left border
    ai: "bg-primary-tint text-primary pl-2.5 pr-2 border-l-2 border-edge-teal",
  };

  const baseClasses = "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border";

  return (
    <span className={`${baseClasses} ${styles[variant]} ${className}`}>
      {variant === 'ai' && <Sparkles size={10} className="text-edge-magenta" />}
      {children}
    </span>
  );
};
