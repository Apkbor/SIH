/**
 * Main Express Server
 *
 * Architecture:
 *   Express API  ← handles REST endpoints
 *   Socket.io    ← pushes real-time sensor data to frontend
 *   SQLite (sql.js) ← persists all readings, alerts, inventory
 *   Simulator    ← generates fake sensor data on interval
 *
 * THE HARDWARE-AGNOSTIC BOUNDARY:
 *   ingestReading(reading) is the single function any data source calls.
 *   Real MQTT → ingestReading(), real webhook → ingestReading(), simulator → ingestReading().
 *   To swap in real hardware: add listener → calls ingestReading(), stop simulator. Done.
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

// Load config
dotenv.config();

// Import modules
import { initDatabase, getDb, saveDatabase } from './db/index.js';
import {
  startSimulator,
  stopSimulator,
  ingestReading,
  setIoServer,
  setBlackout,
  isBlackoutActive,
  drainBlackoutQueue,
  sensorStates,
  adjustSensorState,
  onAlert,
} from './simulator/engine.js';
import { getEnergyForecast, getLogisticsForecast, getEnvironmentForecast } from './forecasting/index.js';
import { simulateGeneratorFailure, simulateFuelDisruption } from './simulation/index.js';
import { dispatchNotification } from './notifications/dispatcher.js';
import { registerChatHandlers, getChannels, getMessages, getRecentMessages } from './chat/index.js';

// ============================================================
// APP SETUP
// ============================================================

// CORS: allow specific origin from env, fallback to localhost for dev
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

const server = createServer(app);
const io = new Server(server, {
  cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'] },
});

setIoServer(io);

// ============================================================
// DATABASE — async init
// ============================================================

await initDatabase();

// ============================================================
// SOCKET.IO — real-time subscriptions
// ============================================================

io.on('connection', (socket) => {
  console.log('[SOCKET] Client connected:', socket.id);

  socket.on('subscribe:sensor', ({ stationId, type }) => {
    socket.join(`sensor:${stationId}:${type}`);
  });

  socket.on('subscribe:alerts', ({ stationId }) => {
    socket.join(`alerts:${stationId}`);
    socket.join('alerts:all');
  });

  // Allow frontend to seed alerts from DB on connect
  socket.on('alerts:seed', (existingAlerts) => {
    existingAlerts.forEach(alert => {
      const sid = alert.station_id || alert.stationId;
      if (sid) io.to(`alerts:${sid}`).emit('alert', alert);
    });
  });

  socket.on('subscribe:blackout', () => {
    socket.join('blackout');
    socket.emit('blackout:status', { active: isBlackoutActive() });
  });

  socket.on('override:backupGenerator', ({ stationId }) => {
    handleBackupOverride(stationId);
  });

  socket.on('simulator:inject-anomaly', ({ stationId, type }) => {
    handleInjectAnomaly(stationId, type);
  });

  socket.on('blackout:toggle', ({ active }) => {
    setBlackout(active);
    console.log(`[BLACKOUT] Toggled: ${active}`);
  });

  socket.on('blackout:end', async () => {
    console.log('[BLACKOUT] Ending — draining queue');
    setBlackout(false);
    await drainBlackoutQueue();
  });

  // ---- Chat handlers (Feature 2) ----
  registerChatHandlers(socket);

  socket.on('disconnect', () => {
    console.log('[SOCKET] Client disconnected:', socket.id);
  });
});

// ============================================================
// REST API ENDPOINTS
// ============================================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    simulator: 'running',
    blackout: isBlackoutActive(),
    timestamp: new Date().toISOString(),
  });
});

// Stations
app.get('/api/stations', (req, res) => {
  const db = getDb();
  res.json(dbAllFromDb(db, 'SELECT * FROM stations'));
});

app.get('/api/stations/:stationId/buildings', (req, res) => {
  const db = getDb();
  res.json(dbAllFromDb(db, 'SELECT * FROM buildings WHERE station_id = ?', req.params.stationId));
});

// Latest readings
app.get('/api/stations/:stationId/latest', (req, res) => {
  const db = getDb();
  const stationId = req.params.stationId;
  const result = {};

  for (const type of ['energy', 'environment']) {
    const rows = dbAllFromDb(db,
      'SELECT data FROM readings WHERE station_id = ? AND type = ? ORDER BY timestamp DESC LIMIT 1',
      stationId, type);
    if (rows.length > 0) result[type] = JSON.parse(rows[0].data);
  }
  // Logistics: use inventory table (has current quantities + days remaining)
  const logItems = dbAllFromDb(db,
    'SELECT id, station_id, category, item, current_qty, unit, daily_rate, days_remaining FROM inventory WHERE station_id = ? ORDER BY days_remaining ASC',
    stationId);
  if (logItems.length > 0) {
    result.logistics = logItems.map(item => ({
      stationId: item.station_id,
      buildingId: null,
      type: 'logistics',
      category: item.category,
      item: item.item,
      quantity: item.current_qty,
      unit: item.unit,
      dailyRate: item.daily_rate,
      daysRemaining: item.days_remaining,
    }));
  }
  // Infrastructure has one row per building — fetch all recent readings
  const infraRows = dbAllFromDb(db,
    'SELECT data FROM readings WHERE station_id = ? AND type = ? ORDER BY timestamp DESC LIMIT 100',
    stationId, 'infrastructure');
  if (infraRows.length > 0) {
    result.infrastructure = infraRows.map(r => JSON.parse(r.data));
  }
  res.json(result);
});

// Historical readings
app.get('/api/stations/:stationId/readings', (req, res) => {
  const db = getDb();
  const stationId = req.params.stationId;
  const type = req.query.type || 'energy';
  const limit = parseInt(req.query.limit || '50', 10);

  const rows = dbAllFromDb(db,
    'SELECT data, timestamp FROM readings WHERE station_id = ? AND type = ? ORDER BY timestamp DESC LIMIT ?',
    stationId, type, limit);

  const data = rows.map(r => ({ ...JSON.parse(r.data), timestamp: r.timestamp })).reverse();
  res.json(data);
});

// Alerts
app.get('/api/alerts', (req, res) => {
  const db = getDb();
  const stationId = req.query.stationId;
  const unresolved = req.query.unresolved === 'true';

  let sql = 'SELECT * FROM alerts';
  const params = [];

  if (stationId) {
    sql += ' WHERE station_id = ?';
    params.push(stationId);
    if (unresolved) sql += ' AND resolved = 0';
  } else if (unresolved) {
    sql += ' WHERE resolved = 0';
  }

  sql += ' ORDER BY timestamp DESC LIMIT 100';
  res.json(dbAllFromDb(db, sql, ...params));
});

app.post('/api/alerts/:id/acknowledge', (req, res) => {
  const db = getDb();
  dbRunFromDb(db, 'UPDATE alerts SET acknowledged = 1 WHERE id = ?', req.params.id);
  saveDatabase();
  const updated = dbOneFromDb(db, 'SELECT * FROM alerts WHERE id = ?', req.params.id);
  io.emit('alert:updated', updated);
  res.json(updated);
});

app.post('/api/alerts/:id/resolve', (req, res) => {
  const db = getDb();
  dbRunFromDb(db, 'UPDATE alerts SET resolved = 1, acknowledged = 1 WHERE id = ?', req.params.id);
  saveDatabase();
  const updated = dbOneFromDb(db, 'SELECT * FROM alerts WHERE id = ?', req.params.id);
  io.emit('alert:updated', updated);
  res.json(updated);
});

// ---- Notifications (Feature 1) ----

// GET recent notification dispatch log
app.get('/api/notifications', (req, res) => {
  try {
    const db = getDb();
    const stationId = req.query.stationId;
    const limit = parseInt(req.query.limit || '50', 10);

    let sql = 'SELECT * FROM notifications';
    const params = [];
    if (stationId) {
      sql += ' WHERE station_id = ?';
      params.push(stationId);
    }
    sql += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);
    res.json(dbAllFromDb(db, sql, ...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET currently active (unresolved) notifications
app.get('/api/notifications/active', (req, res) => {
  try {
    const db = getDb();
    const rows = dbAllFromDb(db,
      "SELECT * FROM active_notifications WHERE status != 'resolved' ORDER BY first_seen DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST manual dispatch (for demo/override)
app.post('/api/notifications/dispatch', async (req, res) => {
  try {
    const { alertId } = req.body;
    const db = getDb();
    const alert = dbOneFromDb(db, 'SELECT * FROM alerts WHERE id = ?', alertId);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    const record = await dispatchNotification(alert);
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Chat (Feature 2) ----

// GET chat channels
app.get('/api/chat/channels', (req, res) => {
  res.json(getChannels());
});

// GET messages for a channel
app.get('/api/chat/messages', (req, res) => {
  const channel = req.query.channel;
  if (!channel) return res.status(400).json({ error: 'channel query param required' });
  const limit = parseInt(req.query.limit || '100', 10);
  res.json(getMessages(channel, limit));
});

// POST chat message
app.post('/api/chat/message', async (req, res) => {
  try {
    const { channel, sender, content, msg_type = 'user', station_id } = req.body;
    if (!channel || !sender || !content) {
      return res.status(400).json({ error: 'channel, sender, content required' });
    }
    const { saveMessage } = await import('./chat/index.js');
    const msg = saveMessage(channel, sender, content, msg_type, station_id);
    res.json(msg);
  } catch (err) {
    console.error('[CHAT] Failed to save message:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST broadcast message to all channels
app.post('/api/chat/broadcast', async (req, res) => {
  try {
    const { sender, content, msg_type = 'user', station_id } = req.body;
    if (!sender || !content) {
      return res.status(400).json({ error: 'sender, content required' });
    }
    const { broadcastMessage } = await import('./chat/index.js');
    const results = broadcastMessage(sender, content, msg_type, station_id);
    res.json({ sent: results.length, messages: results });
  } catch (err) {
    console.error('[BROADCAST] Failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET recent messages across all channels
app.get('/api/chat/all', (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '200', 10);
    const { getAllMessages } = require('./chat/index.js');
    res.json(getAllMessages(limit));
  } catch (err) {
    console.error('[CHAT] getAllMessages failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Inventory
app.get('/api/stations/:stationId/inventory', (req, res) => {
  const db = getDb();
  res.json(dbAllFromDb(db, 'SELECT * FROM inventory WHERE station_id = ? ORDER BY days_remaining ASC', req.params.stationId));
});

// Forecasts
app.get('/api/stations/:stationId/forecast', (req, res) => {
  try {
    const stationId = req.params.stationId;

    // Energy forecasts: [{ title, value, severity }] → [{ title, description, value, priority }]
    const rawEnergy = getEnergyForecast(stationId);
    const energy = (Array.isArray(rawEnergy) ? rawEnergy : []).map(f => ({
      title: f.title,
      description: f.value,
      value: f.value,
      priority: f.severity === 'critical' ? 'critical' : f.severity === 'warning' ? 'warning' : 'info',
    }));

    // Logistics forecasts: { insights: [{ severity, message, item, daysRemaining }] } → [{ title, description, value, priority }]
    const rawLogistics = getLogisticsForecast(stationId);
    const logistics = (rawLogistics?.insights || []).map(f => ({
      title: f.item || 'Inventory',
      description: f.message,
      value: f.message,
      priority: f.severity === 'critical' ? 'critical' : f.severity === 'warning' ? 'warning' : 'info',
    }));

    // Environment forecasts: { averageTempC, ... } → [{ title, description, value, priority }]
    const rawEnv = getEnvironmentForecast(stationId);
    const environment = rawEnv && rawEnv.message ? [{
      title: 'Temperature Outlook',
      description: rawEnv.message,
      value: rawEnv.message,
      priority: rawEnv.trend === 'warming' ? 'warning' : 'info',
    }] : [];

    res.json({ energy, logistics, environment });
  } catch (err) {
    res.status(500).json({ error: 'Forecast computation failed', details: err.message });
  }
});

// What-If Simulations
app.post('/api/simulate/generator-failure', (req, res) => {
  try {
    const { stationId, ...options } = req.body;
    res.json(simulateGeneratorFailure(stationId, options));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/simulate/fuel-disruption', (req, res) => {
  try {
    const { stationId } = req.body;
    res.json(simulateFuelDisruption(stationId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cross-station comparison
app.get('/api/compare', (req, res) => {
  const db = getDb();
  const result = {};

  for (const sid of ['BHARATI', 'MAITRI']) {
    const energyRows = dbAllFromDb(db,
      'SELECT data FROM readings WHERE station_id = ? AND type = ? ORDER BY timestamp DESC LIMIT 1',
      sid, 'energy');
    const envRows = dbAllFromDb(db,
      'SELECT data FROM readings WHERE station_id = ? AND type = ? ORDER BY timestamp DESC LIMIT 1',
      sid, 'environment');
    const alertCount = dbOneFromDb(db,
      'SELECT COUNT(*) as c FROM alerts WHERE station_id = ? AND resolved = 0', sid);
    const criticalCount = dbOneFromDb(db,
      'SELECT COUNT(*) as c FROM alerts WHERE station_id = ? AND resolved = 0 AND priority = ?', sid, 'P0');
    const lowInventory = dbOneFromDb(db,
      'SELECT COUNT(*) as c FROM inventory WHERE station_id = ? AND days_remaining < 21', sid);

    const rawForecast = getEnergyForecast(sid);
    const fuelInsight = (Array.isArray(rawForecast) ? rawForecast : []).find(f => f.title === 'Fuel Outlook');
    result[sid] = {
      energy: energyRows.length > 0 ? JSON.parse(energyRows[0].data) : null,
      environment: envRows.length > 0 ? JSON.parse(envRows[0].data) : null,
      alertCount: alertCount?.c || 0,
      criticalAlertCount: criticalCount?.c || 0,
      lowInventoryCount: lowInventory?.c || 0,
      forecast: {
        fuelMessage: fuelInsight?.value || 'Computing...',
        fuelPriority: fuelInsight?.severity || 'info',
      },
      lastReadingTimestamp: energyRows.length > 0 ? energyRows[0].timestamp : null,
      isStale: false,
    };

    // Mark stale if last reading is older than 2x tick interval
    if (result[sid].lastReadingTimestamp) {
      const age = Date.now() - result[sid].lastReadingTimestamp;
      result[sid].isStale = age > 20000; // >20s = stale
    }
  }

  res.json(result);
});

// Inject anomaly on demand (from frontend simulator)
function handleInjectAnomaly(stationId, type) {
  const state = sensorStates[stationId];
  if (!state) return;

  switch (type) {
    case 'generator_overheat':
      state.generatorTempC = 110 + Math.random() * 25;
      break;
    case 'fuel_leak':
      state.fuelPercent = Math.max(5, state.fuelPercent - 15);
      break;
    case 'wind_gust':
      state.windSpeedKmh = 90 + Math.random() * 40;
      break;
    case 'battery_drain':
      state.batteryPercent = Math.max(10, state.batteryPercent - 20);
      break;
  }

  console.log(`[SIM] Injected anomaly: ${type} on ${stationId}`);
}

// Manual override
async function handleBackupOverride(stationId) {
  const db = getDb();
  const alert = {
    id: `A-MANUAL-${Date.now()}`,
    stationId,
    priority: 'P1',
    category: 'override',
    title: 'Manual Override: Backup Generator Started',
    description: 'Operator manually activated backup generator',
    value: 'ACTIVE',
    threshold: 'MANUAL',
  };

  dbRunFromDb(db,
    'INSERT INTO alerts (id, station_id, priority, category, title, description, value, threshold) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    alert.id, alert.stationId, alert.priority, alert.category, alert.title,
    alert.description, alert.value, alert.threshold);
  saveDatabase();

  io.to(`alerts:${stationId}`).emit('alert', alert);
  io.to('alerts:all').emit('alert', alert);

  adjustSensorState(stationId, 'batteryPercent', 15);
}

// ============================================================
// SQL.js compatible query helpers (using step/bind API)
// ============================================================

function dbAllFromDb(db, sql, ...params) {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params.length > 0 ? params : []);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    return rows;
  } finally {
    stmt.free();
  }
}

function dbOneFromDb(db, sql, ...params) {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params.length > 0 ? params : []);
    if (stmt.step()) {
      return stmt.getAsObject();
    }
    return null;
  } finally {
    stmt.free();
  }
}

function dbRunFromDb(db, sql, ...params) {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params.length > 0 ? params : []);
    stmt.step();
    return { changes: db.getRowsModified() };
  } finally {
    stmt.free();
  }
}

// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT || 3001;

server.listen(PORT, async () => {
  console.log(`\n🚀 Antarctic Digital Twin Platform — Backend`);
  console.log(`   API:  http://localhost:${PORT}`);
  console.log(`   Socket.io: ws://localhost:${PORT}`);
  console.log(`   Simulator speed: ${process.env.SIMULATOR_SPEED || '1'}x`);
  console.log(`   Env: ${process.env.NODE_ENV || 'development'}`);
  console.log('');

  // Start sensor simulator (needs DB to be ready)
  startSimulator();

  // Load active notification state from DB (dedup continuity across restarts)
  const { loadActiveNotifications } = await import('./services/activeNotifications.js');
  loadActiveNotifications();

  // Register all-priority alert handler — dedup-aware dispatch + chat integration
  onAlert(async (alert) => {
    try {
      // ---- FEATURE 1: Auto-dispatch notification to authority ----
      // dispatchNotification writes to DB + emits 'notification:new' via Socket.io
      const { dispatchNotification } = await import('./notifications/dispatcher.js');
      const notificationRecord = await dispatchNotification(alert);

      // ---- SMS dedup (legacy flow, logs result) ----
      const { checkAndDispatch } = await import('./services/activeNotifications.js');
      const smsResult = await checkAndDispatch(alert);
      if (smsResult.action === 'sent') {
        console.log(`[ALERT→SMS] ${alert.priority} SMS dispatched for ${smsResult.signature}`);
      } else if (smsResult.action === 'suppressed') {
        console.log(`[ALERT→SMS] Duplicate suppressed: ${smsResult.signature} (#${smsResult.occurrenceCount} occurrences)`);
      } else if (smsResult.action === 'escalated') {
        console.log(`[ALERT→SMS] Escalation SMS sent for ${smsResult.signature} (active ${smsResult.duration}min)`);
      } else if (smsResult.action === 'resolved') {
        console.log(`[ALERT→SMS] Resolved: ${smsResult.signature} (was active ${smsResult.duration}min)`);
      }

      // ---- FEATURE 2: Post system message to chat ----
      const channelMap = {
        energy: 'ops-bharati',
        fuel: 'ops-bharati',
        generator: 'engineering',
        environment: 'ops-bharati',
        infrastructure: 'engineering',
        logistics: 'ops-bharati',
      };
      const chatChannel = channelMap[alert.category] || 'ops-bharati';
      const stationNames = { BHARATI: 'Bharati', MAITRI: 'Maitri' };
      const stationName = stationNames[alert.stationId] || alert.stationId;

      let chatContent;
      if (smsResult.action === 'sent' || smsResult.action === 'escalated') {
        chatContent = `${alert.priority} ALERT: ${alert.title} — ${stationName}. Authority notified: ${notificationRecord?.authority || 'N/A'}. Ref: ${alert.id}`;
      } else {
        // Suppressed or resolved — log quietly but don't spam chat
        return;
      }

      const { saveMessage } = await import('./chat/index.js');
      saveMessage(chatChannel, 'SYSTEM', chatContent, 'system', alert.stationId);
    } catch (err) {
      console.error('[ALERT-HANDLER] Failed:', err.message);
    }
  });
});

// Graceful shutdown — always flush DB
process.on('SIGINT', () => {
  console.log('\n[SHUTDOWN] Stopping simulator...');
  stopSimulator();
  saveDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[SHUTDOWN] SIGTERM received');
  stopSimulator();
  saveDatabase();
  process.exit(0);
});
