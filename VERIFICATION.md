# 🧪 End-to-End Verification Guide
## Antarctic Digital Twin Platform — Full Test Checklist

---

## How to Run

### Terminal 1 — Backend
```bash
cd c:\Users\Arpit Yadav\Desktop\SIH\backend
npm run dev
```

Expected output:
```
🚀 Antarctic Digital Twin Platform — Backend
   API:  http://localhost:3001
   Socket.io: ws://localhost:3001
   Simulator speed: 1x
```

### Terminal 2 — Frontend
```bash
cd c:\Users\Arpit Yadav\Desktop\SIH\frontend
npm run dev
```

Expected output:
```
VITE v5.4.21  ready in 450 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### Browser
Open http://localhost:5173

---

## ✅ Verification Checklist

### 1. STARTUP CHECK
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Browser opens to intro screen (not blank)
- [ ] Intro screen shows: "Antarctic Digital Twin" title, tagline, PS 26060
- [ ] After ~2.5s, auto-transitions to dashboard
- [ ] Or click "Enter Command Center" to skip

### 2. LANDING / INTRO EXPERIENCE
- [ ] Animated aurora background visible (green/cyan glow)
- [ ] Topographic contour lines visible (subtle)
- [ ] Station badges show "BHARATI" and "MAITRI"
- [ ] "Enter Command Center" button has hover effect
- [ ] Intro fades out smoothly

### 3. DASHBOARD OVERVIEW (Home)
- [ ] Shows "Bharati — Command Overview" (or Maitri if switched)
- [ ] 4 metric cards visible: Fuel, Battery, Active Alerts, Station Health
- [ ] Feature cards grid shows: Monitoring, Alerts, Forecasts, Simulator, Compare
- [ ] System Status section shows Connection, Data Feed, Blackout, Simulator
- [ ] If no data: Loading spinner appears
- [ ] If API fails: Error state with retry button

### 4. LIVE MONITORING (/monitoring)
- [ ] Gauges row shows: Fuel, Battery, Generator Load, Solar, Temperature
- [ ] Gauges animate smoothly (no jumping)
- [ ] Values update every 5 seconds without refresh
- [ ] Building status grid shows cards with power/heat status
- [ ] Logistics panel shows inventory items with countdown bars
- [ ] Energy trends chart shows last 50 readings
- [ ] BLACKOUT badge appears if blackout is active

### 5. ALERTS PAGE (/alerts)
- [ ] Shows alerts feed (initially empty, fills as anomalies trigger)
- [ ] Priority filters: ALL, P0, P1, P2
- [ ] Status filters: All, Unresolved, Acknowledged, Resolved
- [ ] "Simulate Blackout" button visible
- [ ] When clicked: Shows "End Blackout" button
- [ ] Blackout queue drain visualization appears
- [ ] ACK and RESOLVE buttons work on alerts

### 6. FORECASTS PAGE (/forecasts)
- [ ] Shows loading state initially
- [ ] Forecast cards appear after data collection
- [ ] Fuel forecast shows "days remaining" estimate
- [ ] Generator forecast shows maintenance recommendation
- [ ] Values update when switching stations

### 7. SIMULATOR PAGE (/simulator)
- [ ] Two scenario cards: Generator Failure, Fuel Disruption
- [ ] "Run Simulation" button triggers scenario
- [ ] Results panel shows projected impact
- [ ] Results are clearly labeled "SIMULATED — NOT LIVE"
- [ ] Live dashboard data unchanged after simulation

### 8. COMPARE PAGE (/compare)
- [ ] Side-by-side Bharati vs Maitri layout
- [ ] Independent data for each station
- [ ] Alert counts shown for both
- [ ] Pattern detection highlight appears when conditions match

### 9. ABOUT PAGE (/about)
- [ ] Problem statement section visible
- [ ] Solution section with feature bullets
- [ ] "What Makes It Unique" grid (6 items)
- [ ] Tech stack breakdown
- [ ] Interactive architecture diagram (SVG)
- [ ] Team attribution

### 10. DEMO MODE
- [ ] "Start Demo Walkthrough" button in top bar
- [ ] Clicking it opens demo panel at bottom of screen
- [ ] Progress bar fills as demo advances
- [ ] Caption text updates for each step
- [ ] Pause/Resume and Exit buttons work
- [ ] Demo auto-advances through all 8 steps

### 11. ERROR STATES
- [ ] Stop backend → Dashboard shows "Unable to reach backend" with retry button
- [ ] Click retry → Shows same error (backend still down)
- [ ] Restart backend → Dashboard auto-loads data
- [ ] Monitoring page shows error state when API fails
- [ ] Forecasts page shows error state when API fails

### 12. SIDEBAR NAVIGATION
- [ ] All 7 nav items visible: Dashboard, Monitoring, Alerts, Forecasts, Simulator, Compare, About
- [ ] Active page highlighted in sidebar
- [ ] Clicking nav items switches pages smoothly
- [ ] Page transition animation (fade) works
- [ ] Collapse button (hamburger) works

### 13. STATION SELECTOR
- [ ] Dropdown shows "Bharati — Dakshin Gangotri" and "Maitri — Schirmacher Oasis"
- [ ] Switching stations updates all data
- [ ] Dashboard metrics update
- [ ] Monitoring gauges update
- [ ] Forecasts recompute

### 14. BLACKOUT SIMULATION
- [ ] Navigate to Alerts page
- [ ] Click "Simulate Blackout"
- [ ] Top bar shows pulsing red "BLACKOUT" badge
- [ ] Dashboard shows "BLACKOUT — Data Queued" badge
- [ ] Simulator continues running (check backend console)
- [ ] Click "End Blackout"
- [ ] Queue drain animation plays (P0 → P1 → P2 order)
- [ ] Top bar returns to green "LIVE" badge

### 15. MANUAL OVERRIDE
- [ ] Backend console shows: "Manual Override: Backup Generator Started"
- [ ] Alert appears in alerts feed
- [ ] Battery gauge increases by 15%

### 16. VISUAL QA
- [ ] Dark theme consistent across all pages
- [ ] No white/light cards breaking the theme
- [ ] Text readable (no low contrast)
- [ ] Buttons have hover states
- [ ] Cards have hover lift effect
- [ ] Smooth transitions everywhere
- [ ] No console errors in browser DevTools
- [ ] No layout shifts or jank

### 17. PERFORMANCE
- [ ] App runs for 5+ minutes without slowdown
- [ ] No memory leaks (check DevTools Performance tab)
- [ ] DB size stays reasonable (backend console shows periodic trim messages)
- [ ] Socket.io reconnects if backend restarts

---

## 🎯 Demo Script (60-90 seconds)

**For hackathon presentation:**

1. **Open app** → Intro screen auto-plays → "Enter Command Center"
2. **Click "Start Demo Walkthrough"** (top bar, second button)
3. **Let it run automatically:**
   - "Live sensor feeds streaming in real-time"
   - [Anomaly injects] "Generator overheating — P0 alert fires"
   - [Blackout activates] "Satellite link down, data queues locally"
   - [Blackout ends] "Link restored — P0→P1→P2 queue drain"
   - "AI forecasts computed from time-series"
   - "What-if simulation: generator failure scenario"
   - "Demo complete"
4. **Click "Monitoring"** in sidebar → Show live gauges updating
5. **Click "Compare"** → Show Bharati vs Maitri side-by-side
6. **Click "About"** → Show problem statement + architecture diagram
7. **Click "Simulate Blackout"** in Alerts → Show priority sync in action

**Total time: ~90 seconds with narration**

---

## 🐛 Known Issues / Limitations

1. **Real hardware not connected** — Simulator runs by default, but `ingestReading()` is hardware-agnostic (just add MQTT listener)
2. **No persistent login** — Single-user demo, no auth
3. **SQLite not PostgreSQL** — Works locally, but for production deployment, swap to PostgreSQL (schema is compatible)
4. **Linear regression only** — No neural networks, but explainable and sufficient for demo
5. **Demo mode requires manual restart** — After one run, refresh page to replay

---

## 📦 Deployment Notes

### Backend (Render/Railway/Fly.io)
```bash
# Set environment variables:
PORT=3001
SIMULATOR_SPEED=1x
NODE_ENV=production
```

### Frontend (Vercel/Netlify)
```bash
# vite.config.js — update proxy target:
export default defineConfig({
  server: {
    proxy: {
      '/api': 'https://your-backend-url.com',
      '/socket.io': { target: 'https://your-backend-url.com', ws: true }
    }
  }
})
```

---

## 🏆 SIH 2026 Submission Checklist

- [x] Problem statement addressed (PS 26060)
- [x] Live sensor monitoring
- [x] Priority sync simulator (P0/P1/P2 + blackout)
- [x] Predictive analytics (explainable AI)
- [x] What-if simulation
- [x] Cross-station comparison
- [x] Manual override
- [x] Demo mode for presentation
- [x] Error handling & empty states
- [x] Professional UI/UX
- [x] Zero cloud dependencies
- [x] Documentation complete
- [x] Code modular & commented
- [x] Hardware-agnostic architecture

**STATUS: READY FOR SUBMISSION** ✅
