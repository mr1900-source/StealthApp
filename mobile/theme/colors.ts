/**
 * Color Palette
 * 
 * Warm, earthy, minimal design system.
 * Change colors here to update the entire app.
 */

export const colors = {
  // Primary brand color
  primary: '#D4A373',
  primaryDark: '#BC8A5F',
  primaryLight: '#E5C9A8',
  
  // Accent - used for CTAs like "I'm Down"
  accent: '#E07A5F',
  accentDark: '#C4644D',
  accentLight: '#F0A08A',
  
  // Backgrounds
  background: '#FEFAE0',
  surface: '#FFFFFF',
  surfaceSecondary: '#F8F5E9',
  
  // Text
  text: '#2C2C2C',
  textSecondary: '#6B6B6B',
  textTertiary: '#9A9A9A',
  textLight: '#FFFFFF',
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#FFFFFF',
  
  // Borders & Dividers
  border: '#E8E4D9',
  borderLight: '#F0EDE4',
  divider: '#E8E4D9',
  
  // Status colors
  success: '#81B29A',
  successLight: '#A8CCB8',
  warning: '#F4A261',
  error: '#E07A5F',
  errorLight: '#F0A08A',
  
  // Utility
  overlay: 'rgba(0, 0, 0, 0.4)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',
  shadow: 'rgba(44, 44, 44, 0.08)',
  
  // Transparent versions (for backgrounds with opacity)
  primaryTransparent: 'rgba(212, 163, 115, 0.15)',
  accentTransparent: 'rgba(224, 122, 95, 0.15)',
  
  // Social/Category colors
  restaurant: '#E07A5F',
  bar: '#9C6644',
  cafe: '#D4A373',
  event: '#81B29A',
  activity: '#4A7C59',
  trip: '#3D405B',
} as const;

// Dark mode colors (for future use)
export const darkColors = {
  ...colors,
  background: '#1A1A1A',
  surface: '#2C2C2C',
  surfaceSecondary: '#3D3D3D',
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textTertiary: '#6B6B6B',
  border: '#3D3D3D',
  borderLight: '#4A4A4A',
  divider: '#3D3D3D',
} as const;

export type Colors = typeof colors;
