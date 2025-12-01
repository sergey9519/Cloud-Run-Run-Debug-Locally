
import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = "relative inline-flex items-center justify-center font-medium transition-all duration-200 ease-out rounded-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1";
  
  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs tracking-wide",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-base",
  };

  // The Rival Design Variants
  const variants = {
    primary: "bg-primary hover:bg-primary-hover text-ink-inverse shadow-sm focus:ring-primary/40 border border-transparent",
    
    // Secondary: Subtle border, clean interaction
    secondary: "bg-surface border border-border-subtle text-ink-primary hover:bg-subtle/50 hover:border-border-hover focus:ring-border-subtle shadow-sm",
    
    // Ghost: For unobtrusive actions
    ghost: "bg-transparent text-ink-secondary hover:text-ink-primary hover:bg-subtle/50",

    // Danger: Critical actions
    danger: "bg-state-danger text-white hover:bg-red-700 shadow-sm focus:ring-red-500/40",
  };

  return (
    <button
      className={`
        ${baseStyles}
        ${sizeStyles[size]}
        ${variants[variant]}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 size={16} className="animate-spin mr-2" />}
      {!isLoading && leftIcon && <span className="mr-2 opacity-90">{leftIcon}</span>}
      <span className={isLoading ? 'opacity-0' : 'opacity-100'}>{children}</span>
    </button>
  );
};
