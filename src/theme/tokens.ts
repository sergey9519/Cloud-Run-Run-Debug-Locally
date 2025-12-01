
/**
 * RIVAL DESIGN SYSTEM TOKENS
 * "Apple's cooler, slightly more dangerous cousin."
 * 
 * Aesthetic: Ultra-clean light mode. 90% Neutral, 10% Accent.
 * Editorial typography, subtle gradients, high-end feel.
 */

export const colors = {
  // Neutrals (Light Mode)
  bg: {
    app: '#F6F6FA',      // The main canvas. Not pure white.
    surface: '#FFFFFF',  // Cards, sheets, modals.
    subtle: '#ECEEF5',   // Sidebars, muted blocks.
  },
  border: {
    subtle: '#D6D8E2',   // The delicate structural line.
    hover: '#B0B5C8',    // Slightly darker for interactions.
  },
  text: {
    primary: '#101118',  // Near black, softer than #000.
    secondary: '#5D6070',// High readability gray.
    tertiary: '#8F93A3', // Placeholders, disabled.
    inverse: '#FFFFFF',  // Text on primary actions.
  },

  // Primary Accent (Rival Blue)
  accent: {
    primary: '#2463E6',      // Main brand color.
    primaryHover: '#1E4EC8', // Interaction state.
    tint: '#E1EBFF',         // Subtlety (chips, active backgrounds).
  },

  // The "Dangerous Edge" (Gradients & Highlights)
  edge: {
    teal: '#18C9AE',    // Intelligence, Freshness
    magenta: '#E14BF7', // Creative spark, AI
    gradient: 'linear-gradient(90deg, #2463E6 0%, #18C9AE 50%, #E14BF7 100%)',
  },

  // Semantic States
  state: {
    success: '#16A34A',
    successBg: '#E6F9EC',
    warning: '#D97706',
    warningBg: '#FFF4DE',
    danger: '#DC2626',
    dangerBg: '#FDE4E4',
  }
} as const;

export const typography = {
  fontFamily: {
    sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
    display: ['SF Pro Display', 'Inter', 'sans-serif'], // Use Space Grotesk if available
    mono: ['SF Mono', 'IBM Plex Mono', 'monospace'],
  },
  letterSpacing: {
    tight: '-0.02em',
    tighter: '-0.04em',
    wide: '0.02em',
    widest: '0.08em', // For uppercase labels
  }
} as const;

export const radii = {
  sm: '6px',
  md: '12px', // Standard card radius
  lg: '16px', // Modal radius
  pill: '9999px',
} as const;

export const shadows = {
  subtle: '0 1px 2px rgba(0,0,0,0.04)',
  card: '0 4px 12px rgba(16, 17, 24, 0.04)',
  float: '0 12px 32px rgba(16, 17, 24, 0.08)',
} as const;
