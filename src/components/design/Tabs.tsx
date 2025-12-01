
import React from 'react';

interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ items, activeId, onChange }) => {
  return (
    <div className="flex items-center gap-6 border-b border-border-subtle/60 relative">
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`
              relative py-3 px-1 text-sm font-medium transition-colors duration-200
              flex items-center gap-2
              ${isActive ? 'text-ink-primary' : 'text-ink-secondary hover:text-ink-primary'}
            `}
          >
            {item.icon && <span className={isActive ? 'text-primary' : 'opacity-70'}>{item.icon}</span>}
            {item.label}
            
            {/* The "Dangerous Edge" Gradient Indicator */}
            {isActive && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-rival-gradient rounded-t-full animate-enter" />
            )}
          </button>
        );
      })}
    </div>
  );
};
