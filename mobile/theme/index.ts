/**
 * Theme Index
 * 
 * Export all theme values from one place.
 * Import like: import { colors, spacing, textStyles } from '@/theme';
 */

export * from './colors';
export * from './typography';
export * from './spacing';

// Convenience re-export of everything as a single theme object
import { colors, darkColors } from './colors';
import { fonts, fontWeights, fontSizes, lineHeights, textStyles } from './typography';
import { spacing, radius, shadows, layout } from './spacing';

export const theme = {
  colors,
  darkColors,
  fonts,
  fontWeights,
  fontSizes,
  lineHeights,
  textStyles,
  spacing,
  radius,
  shadows,
  layout,
} as const;

export type Theme = typeof theme;
