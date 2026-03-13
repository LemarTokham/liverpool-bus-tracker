# Liverpool Bus Tracker

Real-time bus tracking for Liverpool. Shows live Arriva and Stagecoach bus positions on Google Maps with transit route planning.

## Features

- Live bus positions updated every 10 seconds (Arriva + Stagecoach)
- Transit route planning with multiple route options
- Bus markers filtered to your selected route
- Colour-coded pins by operator (blue = Arriva, orange = Stagecoach)
- Step-by-step route breakdown with walking/bus segments
- Origin/destination swap button
- Live refresh indicator

## Prerequisites

- Node.js 20+
- Python 3.11+
- [BODS API key](https://data.bus-data.dft.gov.uk/) (free)
- [Google Maps API key](https://console.cloud.google.com/google/maps-platform) with Maps JavaScript API, Places API, and Directions API enabled

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env with your BODS API key

uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install

cp .env.example .env
# Edit .env with your Google Maps API key

npm run dev
```

App: http://localhost:5173

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/buses/positions` | All live bus positions |
| `GET /api/buses/positions?line=X4` | Filter by bus line |
| `GET /api/buses/lines` | List of active lines |
| `GET /api/health` | Health check + cache status |

## Tech Stack

- **Frontend:** React, TypeScript, Google Maps API, Material UI
- **Backend:** Python, FastAPI, BODS SIRI/XML feeds
