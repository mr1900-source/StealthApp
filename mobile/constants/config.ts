/**
 * App Configuration & Constants
 */

export const APP_CONFIG = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000',
};

/**
 * Categories
 */
export const CATEGORIES = [
  { id: 'restaurant', label: 'Restaurant', icon: 'restaurant', color: '#EF4444' },
  { id: 'bar', label: 'Bar', icon: 'wine', color: '#8B5CF6' },
  { id: 'cafe', label: 'Cafe', icon: 'cafe', color: '#F59E0B' },
  { id: 'event', label: 'Event', icon: 'calendar', color: '#EC4899' },
  { id: 'activity', label: 'Activity', icon: 'bicycle', color: '#10B981' },
  { id: 'nature', label: 'Nature', icon: 'leaf', color: '#22C55E' },
  { id: 'trip', label: 'Trip', icon: 'airplane', color: '#3B82F6' },
  { id: 'other', label: 'Other', icon: 'bookmark', color: '#6B7280' },
] as const;

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map(c => [c.id, c])
);

/**
 * Reaction types
 */
export const REACTIONS = {
  interested: { label: 'Interested', icon: 'heart', color: '#EF4444' },
  maybe: { label: 'Maybe', icon: 'help-circle', color: '#F59E0B' },
  no: { label: 'No', icon: 'close-circle', color: '#9CA3AF' },
} as const;

/**
 * Theme colors
 */
export const COLORS = {
  // Primary
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  
  // Backgrounds
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceHover: '#F3F4F6',
  
  // Text
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  
  // Borders
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  
  // Status
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  
  // Reactions
  interested: '#EF4444',
  maybe: '#F59E0B',
  no: '#9CA3AF',
};

/**
 * Idea status
 */
export const IDEA_STATUS = {
  idea: { label: 'Idea', color: COLORS.primary },
  planned: { label: 'Planned', color: COLORS.warning },
  completed: { label: 'Done', color: COLORS.success },
} as const;
