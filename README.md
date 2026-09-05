# Antarctic Digital Twin Platform
### AI-Powered Command Center for Indian Antarctic Research Stations
**SIH 2026 — Problem Statement 26060 — NCPOR**

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- No cloud dependencies — runs 100% locally

### Installation

```bash
# Install dependencies
npm install

# In backend/ directory
cd backend
npm install

# In frontend/ directory
cd frontend
npm install
```

### Running

```bash
# Terminal 1 — Start backend
cd backend
npm run dev

# Terminal 2 — Start frontend
cd frontend
npm run dev

# Open browser to http://localhost:5173
```

### Demo Speed

```bash
SIMULATOR_SPEED=10x npm run dev   # 10x faster for live demo
SIMULATOR_SPEED=60x npm run dev   # Instant forecasting demo
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TailwindCSS |
| Backend | Node.js + Express |
| Real-time | Socket.io |
| Database | SQLite (better-sqlite3) |
| Charts | Recharts / Custom SVG |
| Styling | TailwindCSS with custom aurora theme |

---

## Features

### 1. Live Sensor Monitoring
- Real-time gauges for fuel, battery, generator load, solar output
- Environment readings: temperature, wind speed, humidity
- Building status grid with power/heating indicators
- Logistics inventory with days-remaining countdown

### 2. Priority Sync Simulator
- P0/P1/P2 alert classification (rule-based, explainable)
- "Simulate Blackout" mode — data queues locally while link is down
- Priority-ordered queue drain on recovery (P0 → P1 → P2)

### 3. Predictive Analytics
- Linear regression on stored time-series data
- "At current rate, fuel will last ~X days"
- "Generator temp trending up, maintenance in ~X hours"
- Plain-language insight cards, not raw numbers

### 4. What-If Simulator
- Generator failure scenario projection
- Fuel supply disruption scenario
- Affected buildings, battery coverage, backup capacity — all computed from current state

### 5. Cross-Station Comparison
- Side-by-side Bharati vs Maitri
- Pattern detection across stations
- Coordinated alert insights

### 6. Manual Override
- Operator can trigger backup generator
- Immediate alert + sensor state update

### 7. Demo Mode
- "Start Demo Walkthrough" button triggers a scripted 60-90 second sequence
- Auto-injects anomalies, triggers blackout, shows recovery, runs forecasts
- Perfect for hackathon presentations

---

## Project Structure

```
├── backend/
│   ├── index.js                    # Express + Socket.io server
│   ├── simulator/
│   │   ├── engine.js               # Main loop, ingestReading(), alert classification
│   │   ├── sensors.js              # Sensor data generators
│   │   └── SensorState.js          # Stateful drift/anomaly logic
│   ├── db/
│   │   ├── index.js                # SQLite init, CRUD helpers
│   │   └── schema.sql              # Table definitions
│   ├── forecasting/
│   │   └── index.js                # Linear regression forecast engine
│   ├── simulation/
│   │   └── index.js                # What-if scenario logic
│   └── package.json
│
├── frontend/
│   ├── index.html                  # Entry HTML with favicon
│   ├── public/
│   │   └── favicon.svg             # Custom Antarctic theme favicon
│   ├── src/
│   │   ├── main.jsx                # BrowserRouter + AppProvider
│   │   ├── App.jsx                 # Route definitions
│   │   ├── index.css               # Tailwind + custom theme
│   │   ├── contexts/
│   │   │   └── AppContext.jsx      # Global state (socket, liveData, alerts)
│   │   ├── components/
│   │   │   ├── Layout.jsx          # Shared shell (sidebar + topbar)
│   │   │   ├── Sidebar.jsx         # Collapsible navigation
│   │   │   ├── TopBar.jsx          # Station selector, clock, status
│   │   │   ├── Gauge.jsx           # Radial gauge component
│   │   │   ├── BuildingCard.jsx    # Building status card
│   │   │   ├── EnergyChart.jsx     # SVG trend chart
│   │   │   ├── DemoMode.jsx        # Guided demo walkthrough
│   │   │   ├── ErrorBoundary.jsx   # React error boundary
│   │   │   └── IntroScreen.jsx     # Landing splash screen
│   │   ├── pages/
│   │   │   ├── DashboardOverview.jsx  # Home — metrics + feature cards
│   │   │   ├── MonitoringPage.jsx     # Full gauges, buildings, logistics
│   │   │   ├── AlertsPage.jsx         # Alert feed + blackout controls
│   │   │   ├── ForecastsPage.jsx      # AI predictions
│   │   │   ├── SimulatorPage.jsx      # What-if scenarios
│   │   │   ├── ComparePage.jsx        # Station comparison
│   │   │   └── AboutPage.jsx          # Problem statement + architecture
│   │   └── services/
│   │       └── api.js              # All API wrappers
│   └── package.json
```

---

## Architecture

```
┌─────────────┐     feed      ┌─────────────┐   process    ┌──────────┐   insights   ┌────────────┐
│  SENSORS    │ ────────────→ │  BACKEND    │ ───────────→ │  AI      │ ───────────→ │ DASHBOARD  │
│  (energy,   │               │  (Express,  │              │  ENGINE  │              │  (React,   │
│   env,      │               │   SQLite,   │              │  (Linear │              │   Socket)  │
│   infra,    │               │   Socket)   │              │   Reg)   │              │            │
│   logistics)│               │             │              │          │              │    ▲       │
└─────────────┘               └─────────────┘              └──────────┘              │    │       │
                                                                                   │  NCPOR     │
                                                                                   │  Operator  │
                                                                                   └────────────┘
```

---

## Key Design Decisions

### Hardware-Agnostic Ingestion
`ingestReading(reading)` is the single boundary function. Real MQTT/webhook → `ingestReading()`. Simulator → `ingestReading()`. Zero changes downstream when swapping hardware.

### Priority Sync Simulator
When blackout is active, readings queue locally with P0/P1/P2 classification. On recovery, queue drains in strict priority order with visual animation — ensures critical alerts never get stuck behind routine data.

### Explainable AI
Linear regression on time-series data produces plain-language forecasts: "Fuel lasting ~12.4 days" not abstract predictions. Judges can verify the math, not just trust a black box.

### Demo Mode
Scripted walkthrough auto-triggers: anomaly injection → alert fire → blackout → queue drain → forecast update → what-if scenario. 60-90 seconds, no manual clicking needed.

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `stations` | Station metadata |
| `buildings` | Building definitions per station |
| `inventory` | Supply items with days-remaining |
| `readings` | Time-series sensor data (capped at 50k rows) |
| `alerts` | P0/P1/P2 alerts with acknowledge/resolve |

---

## Demo Script (60-90 seconds)

1. Open app → auto-shows intro screen → "Enter Command Center"
2. Click "Start Demo Walkthrough" in top bar
3. Demo auto-plays:
   - Shows live sensor feeds
   - Injects generator overheating anomaly → P0 alert fires
   - Activates blackout → data queues, UI shows BLACKOUT badge
   - Ends blackout → priority queue drains (P0→P1→P2)
   - Shows forecast insights
   - Runs what-if simulation
4. Navigate to Compare page → shows cross-station analysis
5. Show About page → problem statement + architecture diagram

---

## SIH 2026 — Problem Statement 26060

**Problem:** Indian Antarctic research stations (Bharati, Maitri) lack unified, predictive, and resilient monitoring systems for their complex interdependent infrastructure.

**Solution:** AI-Powered Digital Twin Platform providing real-time monitoring, priority-sync communication resilience, predictive analytics, and scenario simulation — all running locally with zero cloud dependencies.

**Innovation:** Priority Sync Simulator (blackout-resilient data queue), Explainable AI forecasts, What-if scenario engine, Cross-station pattern detection.

---

## License

Built for Smart India Hackathon 2026
