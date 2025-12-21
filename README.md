# QuickTrip - AI Itinerary Planner

An AI-powered travel itinerary generator using Google's Gemini API. Create, customize, and save personalized travel itineraries!

## Setup

Clone the repo to download it from GitHub. Perhaps onto the Desktop.

Navigate to the repo using the command line.
```sh
cd ~/Desktop/YOUR-REPO-NAME
```

Create a virtual environment:
```sh
conda create -n itinerary-app-env python=3.10
```

Activate the virtual environment:
```sh
conda activate itinerary-app-env
```

Install package dependencies:
```sh
pip install -r requirements.txt
```

## Configuration

The app requires a Google Gemini API key. Obtain a free Gemini API Key at [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey).

Create a local ".env" file and store your environment variables in there:
```sh
# this is the ".env" file...

GEMINI_API_KEY="your_api_key_here"
SECRET_KEY="your-secret-key-for-flask"
```

## Usage

### Web App

Run the web app (then view in the browser at http://127.0.0.1:5000/):
```sh
python run.py
```

### Using the App

1. Enter a travel prompt describing your trip (destination, duration, budget, interests)
2. Click "Generate Itinerary" to create an AI-powered plan
3. Edit stops by clicking on them
4. Reorder activities using the up/down arrows
5. Save your itinerary with a custom title
6. View saved itineraries in the "Saved Itineraries" page

## Testing

Run tests:
```sh
pytest
```

Run tests with verbose output:
```sh
pytest tests/ -v
```

## Technologies

- Flask (Python web framework)
- Google Gemini API
- Bootstrap 5
- pytest
- Render (deployment)
- GitHub Actions (CI/CD)