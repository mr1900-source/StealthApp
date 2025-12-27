/**
 * Spacing System
 * 
 * Consistent spacing scale for margins, padding, and gaps.
 * Based on a 4px base unit.
 */

// Base spacing unit
const BASE = 4;

// Spacing scale
export const spacing = {
  none: 0,
  xs: BASE,        // 4
  sm: BASE * 2,    // 8
  md: BASE * 3,    // 12
  lg: BASE * 4,    // 16
  xl: BASE * 6,    // 24
  xxl: BASE * 8,   // 32
  xxxl: BASE * 12, // 48
  huge: BASE * 16, // 64
} as const;

// Border radius
export const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

// Shadows
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#2C2C2C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#2C2C2C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#2C2C2C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#2C2C2C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// Common layout values
export const layout = {
  // Screen padding
  screenPaddingHorizontal: spacing.lg,
  screenPaddingVertical: spacing.lg,
  
  // Card
  cardPadding: spacing.lg,
  cardRadius: radius.lg,
  
  // Button
  buttonHeight: 48,
  buttonHeightSmall: 36,
  buttonRadius: radius.md,
  
  // Input
  inputHeight: 48,
  inputRadius: radius.md,
  inputPaddingHorizontal: spacing.lg,
  
  // Avatar sizes
  avatarSm: 32,
  avatarMd: 40,
  avatarLg: 56,
  avatarXl: 80,
  
  // Tab bar
  tabBarHeight: 80,
  
  // Header
  headerHeight: 56,
} as const;

export type Spacing = typeof spacing;
export type Radius = typeof radius;
export type Shadows = typeof shadows;
export type Layout = typeof layout;
