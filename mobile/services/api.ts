/**
 * API Service
 * 
 * All backend communication.
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { APP_CONFIG } from '@/constants/config';

const API_URL = APP_CONFIG.apiUrl;

// =============================================================================
// TOKEN MANAGEMENT
// =============================================================================

let authToken: string | null = null;

export async function setToken(token: string | null) {
  authToken = token;
  if (Platform.OS === 'web') {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  } else {
    if (token) {
      await SecureStore.setItemAsync('auth_token', token);
    } else {
      await SecureStore.deleteItemAsync('auth_token');
    }
  }
}

export async function getToken(): Promise<string | null> {
  if (authToken) return authToken;
  if (Platform.OS === 'web') {
    authToken = localStorage.getItem('auth_token');
  } else {
    authToken = await SecureStore.getItemAsync('auth_token');
  }
  return authToken;
}

// =============================================================================
// REQUEST HELPER
// =============================================================================

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Request failed: ${response.status}`);
  }
  
  return response.json();
}

// =============================================================================
// AUTH
// =============================================================================

export const auth = {
  async signup(email: string, password: string, username?: string, name?: string) {
    return request<{ id: number; email: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, username, name }),
    });
  },
  
  async login(email: string, password: string) {
    const data = await request<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await setToken(data.access_token);
    return data;
  },
  
  async logout() {
    await setToken(null);
  },
  
  async getMe() {
    return request<User>('/auth/me');
  },
};

// =============================================================================
// USERS
// =============================================================================

export const users = {
  async getProfile() {
    return request<User>('/users/me');
  },
  
  async updateProfile(data: Partial<User>) {
    return request<User>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  
  async search(query: string) {
    return request<UserSummary[]>(`/users/search/${encodeURIComponent(query)}`);
  },
  
  async getFriends() {
    return request<UserSummary[]>('/users/me/friends');
  },
  
  async sendFriendRequest(username: string) {
    return request('/users/me/friends/request', {
      method: 'POST',
      body: JSON.stringify({ friend_username: username }),
    });
  },
  
  async getFriendRequests() {
    return request<any[]>('/users/me/friends/requests');
  },
  
  async acceptFriendRequest(friendshipId: number) {
    return request(`/users/me/friends/accept/${friendshipId}`, {
      method: 'POST',
    });
  },
  
  async removeFriend(friendId: number) {
    return request(`/users/me/friends/${friendId}`, {
      method: 'DELETE',
    });
  },
};

// =============================================================================
// IDEAS
// =============================================================================

export const ideas = {
  async create(data: IdeaCreate) {
    return request<Idea>('/ideas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  async getMyIdeas(params?: { category?: string; status?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    return request<IdeaCard[]>(`/ideas${query ? `?${query}` : ''}`);
  },
  
  async getById(id: number) {
    return request<Idea>(`/ideas/${id}`);
  },
  
  async update(id: number, data: Partial<IdeaUpdate>) {
    return request<Idea>(`/ideas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  
  async delete(id: number) {
    return request(`/ideas/${id}`, { method: 'DELETE' });
  },
  
  async react(id: number, reactionType: 'interested' | 'maybe' | 'no') {
    return request(`/ideas/${id}/react`, {
      method: 'POST',
      body: JSON.stringify({ reaction_type: reactionType }),
    });
  },
  
  async removeReaction(id: number) {
    return request(`/ideas/${id}/react`, { method: 'DELETE' });
  },
  
  async parseLink(url: string) {
    return request<ParsedLink>(`/ideas/parse-link?url=${encodeURIComponent(url)}`, {
      method: 'POST',
    });
  },
  
  async placesAutocomplete(query: string, lat?: number, lng?: number) {
    const params = new URLSearchParams({ q: query });
    if (lat) params.set('lat', String(lat));
    if (lng) params.set('lng', String(lng));
    return request<{ results: PlaceResult[] }>(`/ideas/places/autocomplete?${params}`);
  },
};

// =============================================================================
// GROUPS
// =============================================================================

export const groups = {
  async create(name: string, memberIds: number[] = []) {
    return request<Group>('/groups', {
      method: 'POST',
      body: JSON.stringify({ name, member_ids: memberIds }),
    });
  },
  
  async getMyGroups() {
    return request<Group[]>('/groups');
  },
  
  async getById(id: number) {
    return request<Group>(`/groups/${id}`);
  },
  
  async update(id: number, data: { name?: string; cover_image?: string }) {
    return request<Group>(`/groups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  
  async delete(id: number) {
    return request(`/groups/${id}`, { method: 'DELETE' });
  },
  
  async addMember(groupId: number, userId: number) {
    return request(`/groups/${groupId}/members/${userId}`, { method: 'POST' });
  },
  
  async removeMember(groupId: number, userId: number) {
    return request(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' });
  },
};

// =============================================================================
// FEED
// =============================================================================

export const feed = {
  async getHomeFeed(params?: { 
    filter_type?: 'all' | 'shared_with_me' | 'group';
    group_id?: number;
    category?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.filter_type) searchParams.set('filter_type', params.filter_type);
    if (params?.group_id) searchParams.set('group_id', String(params.group_id));
    if (params?.category) searchParams.set('category', params.category);
    const query = searchParams.toString();
    return request<{ ideas: IdeaCard[]; has_more: boolean }>(`/feed${query ? `?${query}` : ''}`);
  },
  
  async getGroupIdeas(groupId: number, category?: string) {
    const params = category ? `?category=${category}` : '';
    return request<IdeaCard[]>(`/feed/groups/${groupId}/ideas${params}`);
  },
};

// =============================================================================
// PLANS
// =============================================================================

export const plans = {
  async create(data: PlanCreate) {
    return request<Plan>('/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  async getMyPlans(status?: string) {
    const params = status ? `?status_filter=${status}` : '';
    return request<Plan[]>(`/plans${params}`);
  },
  
  async getUpcoming() {
    return request<Plan[]>('/plans/upcoming');
  },
  
  async getById(id: number) {
    return request<Plan>(`/plans/${id}`);
  },
  
  async update(id: number, data: Partial<PlanUpdate>) {
    return request<Plan>(`/plans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  
  async delete(id: number) {
    return request(`/plans/${id}`, { method: 'DELETE' });
  },
  
  async rate(id: number, rating: number, note?: string) {
    return request(`/plans/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating, note }),
    });
  },
};

// =============================================================================
// TYPES
// =============================================================================

export interface User {
  id: number;
  email: string;
  username?: string;
  name?: string;
  profile_photo?: string;
  bio?: string;
  created_at: string;
}

export interface UserSummary {
  id: number;
  name?: string;
  username?: string;
  profile_photo?: string;
}

export interface IdeaCreate {
  title: string;
  category: string;
  source_link?: string;
  notes?: string;
  location_name?: string;
  location_lat?: number;
  location_lng?: number;
  images?: string[];
  share_with_user_ids?: number[];
  share_with_group_ids?: number[];
}

export interface IdeaUpdate {
  title?: string;
  category?: string;
  source_link?: string;
  notes?: string;
  location_name?: string;
  location_lat?: number;
  location_lng?: number;
  images?: string[];
  add_user_ids?: number[];
  remove_user_ids?: number[];
  add_group_ids?: number[];
  remove_group_ids?: number[];
}

export interface Idea {
  id: number;
  title: string;
  category: string;
  source_link?: string;
  notes?: string;
  location_name?: string;
  location_lat?: number;
  location_lng?: number;
  status: 'idea' | 'planned' | 'completed';
  created_by: number;
  created_at: string;
  updated_at: string;
  creator: UserSummary;
  images: { id: number; url: string; position: number }[];
  reactions: { interested: number; maybe: number; no: number };
  my_reaction?: 'interested' | 'maybe' | 'no';
  audience_count: number;
  shared_groups: { id: number; name: string }[];
}

export interface IdeaCard {
  id: number;
  title: string;
  category: string;
  location_name?: string;
  status: 'idea' | 'planned' | 'completed';
  created_at: string;
  creator: UserSummary;
  primary_image?: string;
  reactions: { interested: number; maybe: number; no: number };
  my_reaction?: 'interested' | 'maybe' | 'no';
}

export interface Group {
  id: number;
  name: string;
  cover_image?: string;
  created_by: number;
  created_at: string;
  members: UserSummary[];
  member_count: number;
}

export interface PlanCreate {
  idea_id: number;
  date: string;
  time?: string;
  group_id?: number;
  location_name?: string;
  location_lat?: number;
  location_lng?: number;
  participant_ids?: number[];
  roles?: Record<string, string>;
  notes?: string;
}

export interface PlanUpdate {
  date?: string;
  time?: string;
  location_name?: string;
  location_lat?: number;
  location_lng?: number;
  participant_ids?: number[];
  roles?: Record<string, string>;
  notes?: string;
  status?: 'upcoming' | 'completed' | 'canceled';
}

export interface Plan {
  id: number;
  idea_id: number;
  group_id?: number;
  date: string;
  time?: string;
  location_name?: string;
  location_lat?: number;
  location_lng?: number;
  notes?: string;
  roles?: Record<string, string>;
  status: 'upcoming' | 'completed' | 'canceled';
  created_by: number;
  created_at: string;
  idea: IdeaCard;
  group?: { id: number; name: string };
  participants: UserSummary[];
}

export interface ParsedLink {
  success: boolean;
  title?: string;
  images: string[];
  location_hint?: string;
  source_link: string;
}

export interface PlaceResult {
  place_id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
}

export default {
  auth,
  users,
  ideas,
  groups,
  feed,
  plans,
  setToken,
  getToken,
};
