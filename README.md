# Drift

Turn saved ideas into real plans with friends.

## Quick Start

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Run the server
uvicorn app.main:app --reload
```

API will be available at `http://localhost:8000`
API docs at `http://localhost:8000/docs`

### Mobile Setup

```bash
cd mobile

# Install dependencies
npm install

# Start Expo
npx expo start
```

Scan the QR code with Expo Go app on your phone.

### Running Tests

```bash
cd backend
pytest -v
```

## Environment Variables

Create a `.env` file in the backend directory:

```
DATABASE_URL=sqlite:///./drift.db
SECRET_KEY=your-secret-key-here
GOOGLE_PLACES_API_KEY=your-google-api-key
```

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy, SQLite/PostgreSQL
- **Mobile**: React Native, Expo, TypeScript
- **Auth**: JWT tokens

## MVP Features

- [x] User authentication
- [x] Create/save places and events
- [x] Auto-parse Google Maps and event links
- [x] Friend connections
- [x] Feed of friends' saves
- [x] "I'm down" interest signaling
- [x] Match notifications
