/**
 * TypeScript Types
 * 
 * Shared types used throughout the app.
 * Keep in sync with backend schemas.
 */

// User types
export interface User {
  id: number;
  email: string;
  username: string;
  name: string | null;
  school: string | null;
  created_at: string;
}

export interface UserPublic {
  id: number;
  username: string;
  name: string | null;
}

// Auth types
export interface AuthTokens {
  access_token: string;
  token_type: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  username: string;
  password: string;
  name?: string;
  school?: string;
}

// Save types
export type SaveCategory = 
  | 'restaurant'
  | 'bar'
  | 'cafe'
  | 'concert'
  | 'event'
  | 'activity'
  | 'trip'
  | 'other';

export type SaveSourceType =
  | 'manual'
  | 'google_maps'
  | 'instagram'
  | 'tiktok'
  | 'eventbrite'
  | 'reddit'
  | 'other_url';

export type SaveVisibility = 'private' | 'friends' | 'public';

export interface Save {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  category: SaveCategory;
  location_lat: number | null;
  location_lng: number | null;
  location_name: string | null;
  address: string | null;
  source_url: string | null;
  source_type: SaveSourceType;
  image_url: string | null;
  event_date: string | null;
  tags: string | null;
  visibility: SaveVisibility;
  created_at: string;
  interest_count: number;
  user_interested: boolean;
  user: UserPublic | null;
}

export interface SaveCreate {
  title: string;
  description?: string;
  category?: SaveCategory;
  location_lat?: number;
  location_lng?: number;
  location_name?: string;
  address?: string;
  source_url?: string;
  source_type?: SaveSourceType;
  image_url?: string;
  event_date?: string;
  tags?: string;
  visibility?: SaveVisibility;
}

export interface ParsedLink {
  success: boolean;
  source_type: SaveSourceType;
  title: string | null;
  description: string | null;
  category: SaveCategory | null;
  location_lat: number | null;
  location_lng: number | null;
  location_name: string | null;
  address: string | null;
  image_url: string | null;
  event_date: string | null;
  error: string | null;
}

// Interest/Match types
export interface Match {
  save: Save;
  interested_friends: UserPublic[];
  total_interested: number;
}

// Friendship types
export type FriendshipStatus = 'pending' | 'accepted' | 'rejected';

export interface Friendship {
  id: number;
  user_id: number;
  friend_id: number;
  status: FriendshipStatus;
  created_at: string;
}

// API Response types
export interface ApiError {
  detail: string;
}

// Navigation types (for type-safe navigation)
export type RootStackParamList = {
  '(tabs)': undefined;
  'login': undefined;
  'signup': undefined;
  'save/[id]': { id: number };
  'save/new': { url?: string };
};

// Utility types
export type CategoryInfo = {
  label: string;
  icon: string;
  color: string;
};

export const CATEGORY_INFO: Record<SaveCategory, CategoryInfo> = {
  restaurant: { label: 'Restaurant', icon: 'restaurant-outline', color: '#E07A5F' },
  bar: { label: 'Bar', icon: 'beer-outline', color: '#9C6644' },
  cafe: { label: 'Café', icon: 'cafe-outline', color: '#D4A373' },
  concert: { label: 'Concert', icon: 'musical-notes-outline', color: '#81B29A' },
  event: { label: 'Event', icon: 'calendar-outline', color: '#81B29A' },
  activity: { label: 'Activity', icon: 'bicycle-outline', color: '#4A7C59' },
  trip: { label: 'Trip', icon: 'airplane-outline', color: '#3D405B' },
  other: { label: 'Other', icon: 'location-outline', color: '#6B6B6B' },
};
