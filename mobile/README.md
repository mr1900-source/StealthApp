# Drift Mobile App

React Native app built with Expo.

## Setup

```bash
# Install dependencies
npm install

# Start development server
npx expo start
```

Scan the QR code with Expo Go app on your phone.

## Project Structure

```
mobile/
├── app/                    # Screens (Expo Router)
│   ├── (tabs)/             # Tab screens
│   │   ├── index.tsx       # Feed
│   │   ├── vault.tsx       # User's saves
│   │   ├── matches.tsx     # Mutual interests
│   │   └── profile.tsx     # Settings
│   ├── login.tsx           # Login screen
│   ├── signup.tsx          # Signup screen
│   └── save/
│       └── new.tsx         # Create new save
├── components/             # Reusable UI
├── constants/              # App config (name, etc.)
├── contexts/               # React contexts
├── services/               # API client
├── theme/                  # Colors, typography, spacing
└── types/                  # TypeScript types
```

## Changing App Name

Edit `constants/app.config.ts`:

```typescript
export const APP_CONFIG = {
  name: 'Your New Name',
  tagline: 'Your tagline',
  // ...
};
```

## Changing Colors

Edit `theme/colors.ts`:

```typescript
export const colors = {
  primary: '#YOUR_COLOR',
  accent: '#YOUR_ACCENT',
  // ...
};
```

## Connecting to Backend

Edit `constants/app.config.ts`:

```typescript
apiUrl: __DEV__ 
  ? 'http://localhost:8000'  // Development
  : 'https://your-api.com',  // Production
```

For iOS simulator, use `http://localhost:8000`.
For Android emulator, use `http://10.0.2.2:8000`.
For physical device, use your computer's local IP.
