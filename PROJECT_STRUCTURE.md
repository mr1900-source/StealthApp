# Drift - Project Structure

## Overview
Drift is a mobile-first social planning app that helps users save ideas, share with friends, and turn intentions into real plans.

## Tech Stack

### Backend
- **FastAPI** (Python) - Lightweight, fast API framework
- **SQLite** (dev) / **PostgreSQL** (prod) - Database
- **SQLAlchemy** - ORM
- **Pydantic** - Data validation
- **JWT** - Authentication

### Mobile App
- **React Native + Expo** - Cross-platform mobile development
- **Expo Router** - File-based navigation
- **AsyncStorage** - Local storage
- **React Query** - Data fetching/caching

## Directory Structure

```
drift-app/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── config.py            # Environment configuration
│   │   ├── database.py          # Database connection
│   │   ├── models/              # SQLAlchemy models
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── save.py
│   │   │   ├── interest.py
│   │   │   └── friendship.py
│   │   ├── schemas/             # Pydantic schemas
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── save.py
│   │   │   └── interest.py
│   │   ├── routers/             # API routes
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── saves.py
│   │   │   ├── friends.py
│   │   │   └── interests.py
│   │   ├── services/            # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── link_parser.py   # URL parsing logic
│   │   │   └── places.py        # Google Places integration
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── auth.py          # JWT utilities
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_auth.py
│   │   ├── test_saves.py
│   │   └── test_parser.py
│   ├── requirements.txt
│   └── README.md
│
├── mobile/
│   ├── app/                     # Expo Router pages
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx        # Feed tab
│   │   │   ├── vault.tsx        # My saves tab
│   │   │   └── profile.tsx      # Profile tab
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── save/
│   │       ├── [id].tsx         # Individual save view
│   │       └── new.tsx          # Create new save
│   ├── components/
│   │   ├── SaveCard.tsx
│   │   ├── FeedItem.tsx
│   │   ├── InterestButton.tsx
│   │   └── LinkInput.tsx
│   ├── services/
│   │   ├── api.ts               # API client
│   │   └── storage.ts           # AsyncStorage helpers
│   ├── types/
│   │   └── index.ts             # TypeScript types
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
│
├── PROJECT_STRUCTURE.md         # This file
└── README.md                    # Getting started guide
```

## Core Features (MVP)

1. **Quick Save** - Save a place/event with minimal friction
2. **Link Parsing** - Auto-extract info from Google Maps, Eventbrite links
3. **Friend Feed** - See what friends have saved
4. **"I'm Down"** - Signal interest in friends' saves
5. **Match Alerts** - Notification when multiple friends are interested

## API Endpoints

### Auth
- `POST /auth/signup` - Create account
- `POST /auth/login` - Get JWT token
- `GET /auth/me` - Get current user

### Saves
- `GET /saves` - Get user's saves
- `POST /saves` - Create new save
- `GET /saves/{id}` - Get single save
- `DELETE /saves/{id}` - Delete save
- `POST /saves/parse-link` - Parse URL for auto-fill

### Friends
- `GET /friends` - Get friend list
- `POST /friends/request/{user_id}` - Send friend request
- `POST /friends/accept/{user_id}` - Accept request
- `GET /friends/feed` - Get friends' saves

### Interests
- `POST /interests/{save_id}` - Mark "I'm down"
- `DELETE /interests/{save_id}` - Remove interest
- `GET /interests/matches` - Get saves with mutual interest
