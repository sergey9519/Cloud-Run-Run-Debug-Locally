
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  noPadding = false,
  hoverable = false
}) => {
  return (
    <div 
      className={`
        bg-surface 
        border border-border-subtle 
        rounded-md 
        shadow-card
        overflow-hidden
        ${hoverable ? 'transition-transform duration-300 hover:-translate-y-1 hover:shadow-float' : ''}
        ${className}
      `}
    >
      <div className={noPadding ? '' : 'p-6'}>
        {children}
      </div>
    </div>
  );
};
