
/**
 * BACKEND BRAND CONFIGURATION
 * 
 * Re-exports critical design tokens for server-side usage.
 * Useful for: Email templates (inline styles), PDF generation, System notifications.
 */

export const BrandColors = {
  // Core Identity
  Primary: '#2463E6',
  Background: '#F6F6FA',
  Surface: '#FFFFFF',
  TextPrimary: '#101118',
  TextSecondary: '#5D6070',

  // Accents (The Dangerous Edge)
  Teal: '#18C9AE',
  Magenta: '#E14BF7',

  // Status
  Success: '#16A34A',
  Warning: '#D97706',
  Error: '#DC2626',
};

export const BrandMeta = {
  Name: 'Studio Roster',
  Url: 'https://studioroster.com', // Replace with env var
  SupportEmail: 'support@studioroster.com',
};

export const EmailStyles = {
  ButtonPrimary: `background-color: ${BrandColors.Primary}; color: #FFFFFF; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-family: Helvetica, sans-serif; font-weight: bold;`,
  Container: `background-color: ${BrandColors.Background}; padding: 40px; font-family: Helvetica, sans-serif; color: ${BrandColors.TextPrimary};`,
  Card: `background-color: ${BrandColors.Surface}; padding: 24px; border-radius: 12px; border: 1px solid #D6D8E2;`,
};
