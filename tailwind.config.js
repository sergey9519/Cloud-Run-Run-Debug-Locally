
/** @type {import('tailwindcss').Config} */
const { colors, typography, radii, shadows } = require('./src/theme/tokens'); // Adjust path if necessary based on build

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mapping tokens to Tailwind classes
        app: colors.bg.app,
        surface: colors.bg.surface,
        subtle: colors.bg.subtle,
        
        border: {
          subtle: colors.border.subtle,
          hover: colors.border.hover,
        },

        ink: {
          primary: colors.text.primary,
          secondary: colors.text.secondary,
          tertiary: colors.text.tertiary,
          inverse: colors.text.inverse,
        },

        primary: {
          DEFAULT: colors.accent.primary,
          hover: colors.accent.primaryHover,
          tint: colors.accent.tint,
        },

        edge: {
          teal: colors.edge.teal,
          magenta: colors.edge.magenta,
        },

        state: {
          success: colors.state.success,
          'success-bg': colors.state.successBg,
          warning: colors.state.warning,
          'warning-bg': colors.state.warningBg,
          danger: colors.state.danger,
          'danger-bg': colors.state.dangerBg,
        }
      },
      fontFamily: typography.fontFamily,
      letterSpacing: typography.letterSpacing,
      borderRadius: radii,
      boxShadow: shadows,
      backgroundImage: {
        'rival-gradient': 'linear-gradient(90deg, #2463E6 0%, #18C9AE 50%, #E14BF7 100%)',
      }
    },
  },
  plugins: [],
}
