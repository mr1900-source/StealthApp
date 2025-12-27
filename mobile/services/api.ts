/**
 * API Service
 * 
 * Handles all communication with the backend.
 * Separated from UI components for clean architecture.
 */

import { Platform } from 'react-native';
import { APP_CONFIG } from '@/constants/app.config';
import { 
  AuthTokens, 
  LoginCredentials, 
  SignupData, 
  User, 
  UserPublic,
  Save, 
  SaveCreate, 
  ParsedLink,
  Match,
} from '@/types';

const API_URL = APP_CONFIG.apiUrl;
const TOKEN_KEY = 'auth_token';

// Conditionally import SecureStore only on native
let SecureStore: any = null;
if (Platform.OS !== 'web') {
  SecureStore = require('expo-secure-store');
}

// Token management
async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function setToken(token: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(TOKEN_KEY, token);
      return;
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to save token:', error);
  }
}

async function removeToken(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to remove token:', error);
  }
}

// Base fetch with auth header
async function fetchWithAuth(
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> {
  const token = await getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  return response;
}

// Error handling helper
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

// ============================================
// Auth API
// ============================================

export const authApi = {
  async login(credentials: LoginCredentials): Promise<User> {
    const response = await fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    const tokens = await handleResponse<AuthTokens>(response);
    await setToken(tokens.access_token);
    
    // Fetch and return user profile
    return this.getMe();
  },
  
  async signup(data: SignupData): Promise<User> {
    const response = await fetchWithAuth('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    const user = await handleResponse<User>(response);
    
    // Auto-login after signup
    await this.login({ email: data.email, password: data.password });
    
    return user;
  },
  
  async getMe(): Promise<User> {
    const response = await fetchWithAuth('/auth/me');
    return handleResponse<User>(response);
  },
  
  async logout(): Promise<void> {
    await removeToken();
  },
  
  async isLoggedIn(): Promise<boolean> {
    const token = await getToken();
    if (!token) return false;
    
    try {
      await this.getMe();
      return true;
    } catch {
      await removeToken();
      return false;
    }
  },
};

// ============================================
// Saves API
// ============================================

export const savesApi = {
  async getMySaves(category?: string): Promise<Save[]> {
    const params = category ? `?category=${category}` : '';
    const response = await fetchWithAuth(`/saves${params}`);
    return handleResponse<Save[]>(response);
  },
  
  async getSave(id: number): Promise<Save> {
    const response = await fetchWithAuth(`/saves/${id}`);
    return handleResponse<Save>(response);
  },
  
  async createSave(data: SaveCreate): Promise<Save> {
    const response = await fetchWithAuth('/saves', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse<Save>(response);
  },
  
  async updateSave(id: number, data: Partial<SaveCreate>): Promise<Save> {
    const response = await fetchWithAuth(`/saves/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return handleResponse<Save>(response);
  },
  
  async deleteSave(id: number): Promise<void> {
    const response = await fetchWithAuth(`/saves/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail);
    }
  },
  
  async parseLink(url: string): Promise<ParsedLink> {
    const response = await fetchWithAuth(`/saves/parse-link?url=${encodeURIComponent(url)}`, {
      method: 'POST',
    });
    return handleResponse<ParsedLink>(response);
  },
};

// ============================================
// Friends API
// ============================================

export const friendsApi = {
  async getFriends(): Promise<UserPublic[]> {
    const response = await fetchWithAuth('/friends');
    return handleResponse<UserPublic[]>(response);
  },
  
  async getFeed(): Promise<Save[]> {
    const response = await fetchWithAuth('/friends/feed');
    return handleResponse<Save[]>(response);
  },
  
  async searchUsers(query: string): Promise<UserPublic[]> {
    const response = await fetchWithAuth(`/friends/search?q=${encodeURIComponent(query)}`);
    return handleResponse<UserPublic[]>(response);
  },
  
  async sendRequest(userId: number): Promise<void> {
    const response = await fetchWithAuth(`/friends/request/${userId}`, {
      method: 'POST',
    });
    await handleResponse<{ message: string }>(response);
  },
  
  async acceptRequest(userId: number): Promise<void> {
    const response = await fetchWithAuth(`/friends/accept/${userId}`, {
      method: 'POST',
    });
    await handleResponse<{ message: string }>(response);
  },
  
  async getPendingRequests(): Promise<UserPublic[]> {
    const response = await fetchWithAuth('/friends/requests/pending');
    return handleResponse<UserPublic[]>(response);
  },
};

// ============================================
// Interests API
// ============================================

export const interestsApi = {
  async addInterest(saveId: number): Promise<void> {
    const response = await fetchWithAuth(`/interests/${saveId}`, {
      method: 'POST',
    });
    await handleResponse<{ message: string }>(response);
  },
  
  async removeInterest(saveId: number): Promise<void> {
    const response = await fetchWithAuth(`/interests/${saveId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok && response.status !== 204) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail);
    }
  },
  
  async getMatches(): Promise<Match[]> {
    const response = await fetchWithAuth('/interests/matches');
    return handleResponse<Match[]>(response);
  },
  
  async getMyInterests(): Promise<Save[]> {
    const response = await fetchWithAuth('/interests/my');
    return handleResponse<Save[]>(response);
  },
  
  async getInterestedUsers(saveId: number): Promise<UserPublic[]> {
    const response = await fetchWithAuth(`/interests/${saveId}/users`);
    return handleResponse<UserPublic[]>(response);
  },
};

// Export all APIs
export const api = {
  auth: authApi,
  saves: savesApi,
  friends: friendsApi,
  interests: interestsApi,
};

export default api;
