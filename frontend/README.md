# Antarctic Digital Twin Platform — SIH 2026

## Multi-Page React Router Refactoring Complete

### New Architecture

```
frontend/src/
├── main.jsx                          # Entry — BrowserRouter + AppProvider
├── App.jsx                           # Route definitions (6 routes)
├── contexts/
│   └── AppContext.jsx                 # Global state (Socket.io, liveData, alerts, blackout)
├── components/
│   ├── Layout.jsx                    # Shared shell: sidebar + topbar + outlet
│   ├── Sidebar.jsx                   # Collapsible nav with React Router
│   ├── TopBar.jsx                    # Station selector, clock, connection status
│   ├── Gauge.jsx                     # Circular radial gauge component
│   ├── BuildingCard.jsx              # Building status card
│   └── EnergyChart.jsx               # SVG line chart for energy trends
├── pages/
│   ├── DashboardOverview.jsx         # Home — metrics + feature cards
│   ├── MonitoringPage.jsx            # Full gauges, buildings, logistics
│   ├── AlertsPage.jsx                # Alert feed + blackout simulation
│   ├── ForecastsPage.jsx             # AI predictions + trend data
│   ├── SimulatorPage.jsx             # What-if scenario runner
│   └── ComparePage.jsx               # Side-by-side station comparison
└── services/
    └── api.js                        # All fetch wrappers (unchanged)
```

### Page Structure

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | DashboardOverview | Key metrics + feature card launcher |
| `/monitoring` | MonitoringPage | Full gauges, building grid, logistics, energy chart |
| `/alerts` | AlertsPage | Alert feed with P0/P1/P2 filters + blackout controls |
| `/forecasts` | ForecastsPage | AI predictions with supporting data |
| `/simulator` | SimulatorPage | What-if scenario selector + results panel |
| `/compare` | ComparePage | Side-by-side Bharati vs Maitri |

### Navigation Features

- **Persistent left sidebar** — collapsible, ice-blue active states, icons + labels
- **Persistent top bar** — station selector, live clock, connection/blackout status
- **Shared state via AppContext** — selectedStation, liveData, alerts, blackout persist across routes
- **Page transitions** — subtle fade/slide animation on route change
- **Mobile responsive** — sidebar collapses on smaller screens

### Design Theme (Mission Control)

- Deep navy base (#0A1628, #0F1F3D)
- Ice-blue accents (#4FD1E8, #7DDBEE)
- Aurora status colors (green/amber/red)
- Glass-morphism panels with backdrop-blur
- Topographic SVG background pattern
- Scan-line animation on live data cards
- Space Grotesk + Inter typography

### Run Commands

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev

# Open browser to http://localhost:5173
```

### Demo Speed

```bash
SIMULATOR_SPEED=10x npm run dev   # 10x faster for live demo
SIMULATOR_SPEED=60x npm run dev   # Instant forecasting demo
```
