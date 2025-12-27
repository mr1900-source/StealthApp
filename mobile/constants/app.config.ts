/**
 * App Configuration
 * 
 * Change the app name and branding here.
 * This is the ONLY place you need to update when renaming the app.
 */

export const APP_CONFIG = {
  // App Identity
  name: 'Drift',
  tagline: 'Turn ideas into plans',
  
  // URLs
  apiUrl: 'http://localhost:8000',
  
  // App Store / Play Store
  appStoreId: '',
  playStoreId: '',
  
  // Social
  instagramHandle: '@driftapp',
  twitterHandle: '@driftapp',
  
  // Support
  supportEmail: 'support@driftapp.com',
  
  // Feature Flags
  features: {
    enableMatches: true,
    enableMapView: false,  // Coming soon
    enableNotifications: false,  // Coming soon
  },
} as const;

// Type for the config
export type AppConfig = typeof APP_CONFIG;
