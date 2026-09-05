/**
 * Simulator Engine
 *
 * THE HARDWARE-AGNOSTIC BOUNDARY:
 *
 *   ingestReading(reading) is the single function the dummy engine calls.
 *   A real MQTT listener, webhook handler, or serial-port reader calls
 *   this SAME function. Everything downstream (DB write, Socket.io emit,
 *   alert classification, forecast update) is agnostic to where the data came from.
 *
 * To swap in real hardware:
 *   1. Add MQTT listener → calls ingestReading()
 *   2. Remove/disable engine.js interval
 *   3. Done. No other changes needed.
 */

import { SensorState } from './SensorState.js';
import {
  generateEnergyReading,
  generateEnvReading,
  generateInfraReading,
  generateLogisticsReading,
} from './sensors.js';
import { getDb, dbRun, dbAll, dbOne, saveDatabase } from '../db/index.js';

// ============================================================
// CONFIG
// ============================================================
const TICK_INTERVAL_MS = 5000;
const ANOMALY_PROBABILITY = 0.05;

const STATION_IDS = ['BHARATI', 'MAITRI'];

let stationBuildings = {};
let stationInventory = {};
const sensorStates = {};
let alertDispatchHandler = null;
let p0Handler = null;

/**
 * Register a callback invoked when ANY alert (P0/P1/P2) is created.
 * Used by index.js to trigger dedup-aware notification dispatch + chat messages.
 */
export function onAlert(handler) {
  alertDispatchHandler = handler;
}

/**
 * @deprecated Use onAlert() instead — supports all priority levels.
 */
export function onP0Alert(handler) {
  p0Handler = handler;
}

// ============================================================
// INGESTION POINT — hardware-agnostic boundary
// ============================================================

/**
 * ingestReading — THE single function for ingesting any sensor reading.
 *
 * Called by:
 *   - Simulator engine (this file, generate functions → ingestReading)
 *   - Real MQTT listener (future: mqttHandler → ingestReading)
 *   - Real webhook endpoint (future: app.post('/webhook/sensor', ...) → ingestReading)
 *
 * Does three things atomically:
 *   1. Writes to SQLite (time-series store)
 *   2. Emits via Socket.io (real-time push to frontend)
 *   3. Checks for alert conditions (classifies P0/P1/P2)
 */
export function ingestReading(reading) {
  const id = reading.id || `R-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // 1. Persist to SQLite
  dbRun(
    'INSERT INTO readings (id, station_id, building_id, type, data, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
    id,
    reading.stationId,
    reading.buildingId || null,
    reading.type,
    JSON.stringify(reading),
    reading.timestamp
  );

  // Cap readings table at 50,000 rows to prevent DB bloat over long runs
  const count = dbOne('SELECT COUNT(*) as c FROM readings');
  if (count && count.c > 50000) {
    const toDelete = count.c - 50000;
    dbRun(`DELETE FROM readings WHERE id IN (SELECT id FROM readings ORDER BY timestamp ASC LIMIT ${toDelete})`);
    console.log(`[DB] Trimmed ${toDelete} old readings (cap: 50k)`);
  }

  // Periodically save to disk (every ~10 ticks)
  if (Math.random() < 0.1) saveDatabase();

  // 2. Emit via Socket.io
  const io = getIo();
  if (io) {
    io.to(`sensor:${reading.stationId}:${reading.type}`).emit('reading', reading);
  }

  // 3. Check alert conditions
  checkAlerts(reading);
}

// ============================================================
// SOCKET.IO SERVER REFERENCE
// ============================================================
let ioServer = null;

export function setIoServer(server) {
  ioServer = server;
}

export function getIoServer() {
  return ioServer;
}

function getIo() {
  return ioServer;
}

// ============================================================
// ALERT CLASSIFICATION — rule-based, not ML
// P0 = Critical / Safety (immediate danger)
// P1 = Important / Faults (needs attention soon)
// P2 = Routine (informational)
// ============================================================

const alertThresholds = {
  BHARATI: { fuelCritical: 15, batteryCritical: 20, tempMax: 100, windMax: 100 },
  MAITRI:  { fuelCritical: 15, batteryCritical: 20, tempMax: 100, windMax: 100 },
};

const recentAlerts = {};

function checkAlerts(reading) {
  const station = reading.stationId;
  const thresholds = alertThresholds[station] || alertThresholds.BHARATI;
  const now = Date.now();

  function maybeAlert(priority, category, title, desc, value, threshold) {
    const key = `${station}:${priority}:${title}`;
    if (recentAlerts[key] && now - recentAlerts[key] < 120000) return;

    recentAlerts[key] = now;

    const alert = {
      id: `A-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      stationId: station,
      priority,
      category,
      title,
      description: desc,
      value: String(value),
      threshold: String(threshold),
    };

    dbRun(
      'INSERT INTO alerts (id, station_id, priority, category, title, description, value, threshold) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      alert.id, alert.stationId, alert.priority, alert.category, alert.title,
      alert.description, alert.value, alert.threshold
    );

    const io = getIo();
    if (io) {
      io.to(`alerts:${station}`).emit('alert', alert);
      io.to(`alerts:all`).emit('alert', alert);
    }

    // Notify main server for ALL priorities: dedup-aware dispatch + chat messages
    if (alertDispatchHandler) {
      alertDispatchHandler(alert);
    }
    // Backward compat: also fire legacy P0 handler
    if (priority === 'P0' && p0Handler) {
      p0Handler(alert);
    }
  }

  const data = reading;

  if (data.type === 'energy') {
    if (data.fuelPercent < thresholds.fuelCritical) {
      maybeAlert('P0', 'energy', 'CRITICAL: Fuel Level Critical',
        `Fuel at ${data.fuelPercent.toFixed(1)}% — below ${thresholds.fuelCritical}%`,
        data.fuelPercent, thresholds.fuelCritical);
    } else if (data.fuelPercent < 30) {
      maybeAlert('P1', 'energy', 'Fuel Level Low',
        `Fuel at ${data.fuelPercent.toFixed(1)}% — consider resupply`, data.fuelPercent, 30);
    }

    if (data.batteryPercent < thresholds.batteryCritical) {
      maybeAlert('P0', 'energy', 'CRITICAL: Battery Low',
        `Battery at ${data.batteryPercent.toFixed(1)}%`, data.batteryPercent, thresholds.batteryCritical);
    }

    if (data.generatorTempC > thresholds.tempMax) {
      maybeAlert('P0', 'energy', 'CRITICAL: Generator Overheating',
        `Gen temp ${data.generatorTempC.toFixed(1)}°C`, data.generatorTempC, thresholds.tempMax);
    } else if (data.generatorTempC > 95) {
      maybeAlert('P1', 'energy', 'Generator Temperature High',
        `Gen temp ${data.generatorTempC.toFixed(1)}°C`, data.generatorTempC, 95);
    }

    if (data.generatorLoad > 90) {
      maybeAlert('P1', 'energy', 'Generator Load Critical',
        `Load at ${data.generatorLoad.toFixed(1)}%`, data.generatorLoad, 90);
    }

    if (data.solarOutput < 1) {
      maybeAlert('P2', 'energy', 'Solar Output Minimal',
        'No significant solar generation', data.solarOutput, 1);
    }
  }

  if (data.type === 'environment') {
    if (data.windSpeedKmh > thresholds.windMax) {
      maybeAlert('P0', 'environment', 'CRITICAL: Extreme Wind',
        `Wind ${data.windSpeedKmh.toFixed(1)} km/h`, data.windSpeedKmh, thresholds.windMax);
    } else if (data.windSpeedKmh > 70) {
      maybeAlert('P1', 'environment', 'High Wind Alert',
        `Wind ${data.windSpeedKmh.toFixed(1)} km/h`, data.windSpeedKmh, 70);
    }

    if (data.temperatureC < -50) {
      maybeAlert('P1', 'environment', 'Extreme Cold Warning',
        `Temp ${data.temperatureC.toFixed(1)}°C`, data.temperatureC, -50);
    }
  }

  if (data.type === 'infrastructure' && data.buildingId && !data.powerOn) {
    maybeAlert('P0', 'infrastructure', `Power Loss: ${data.buildingId}`,
      `Building ${data.buildingId} lost power`, '0', '1');
  }

  if (data.type === 'logistics' && data.daysRemaining < 7) {
    maybeAlert('P0', 'logistics', `CRITICAL: ${data.item} Supply Critical`,
      `${data.item}: ${data.daysRemaining.toFixed(1)} days remaining`,
      data.daysRemaining, 7);
  } else if (data.type === 'logistics' && data.daysRemaining < 21) {
    maybeAlert('P1', 'logistics', `Low Supply: ${data.item}`,
      `${data.item}: ${data.daysRemaining.toFixed(1)} days remaining`,
      data.daysRemaining, 21);
  }
}

// ============================================================
// BLACKOUT / PRIORITY SYNC SIMULATION
// ============================================================

let blackoutActive = false;
const blackoutQueue = [];

export function setBlackout(active) {
  blackoutActive = active;
  const io = getIo();
  if (io) io.emit('blackout:status', { active });
}

export function isBlackoutActive() {
  return blackoutActive;
}

function queueReading(reading, priority) {
  blackoutQueue.push({ reading, priority, timestamp: Date.now() });
}

export async function drainBlackoutQueue() {
  const io = getIo();
  const priorityOrder = { P0: 0, P1: 1, P2: 2 };

  const queuedAlerts = [];
  const queuedReadings = [];

  for (const item of blackoutQueue) {
    if (item.reading.type === 'alert') {
      queuedAlerts.push(item);
    } else {
      queuedReadings.push(item);
    }
  }

  queuedReadings.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  queuedAlerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const allItems = [...queuedAlerts, ...queuedReadings];

  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    if (item.reading.type === 'alert') {
      io?.to(`alerts:${item.reading.stationId}`).emit('alert', item.reading);
      io?.to(`alerts:all`).emit('alert', item.reading);
    } else {
      const id = item.reading.id || `R-BLK-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      dbRun(
        'INSERT OR IGNORE INTO readings (id, station_id, building_id, type, data, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        id, item.reading.stationId, item.reading.buildingId || null,
        item.reading.type, JSON.stringify(item.reading), item.reading.timestamp
      );
      io?.to(`sensor:${item.reading.stationId}:${item.reading.type}`).emit('reading', item.reading);
    }

    io?.emit('blackout:drain', { processed: i + 1, total: allItems.length });
    await new Promise(r => setTimeout(r, 80));
  }

  blackoutQueue.length = 0;
  if (io) io.emit('blackout:drain', { processed: allItems.length, total: allItems.length, done: true });
}

// ============================================================
// ENGINE LOOP
// ============================================================

let intervalId = null;

function loadStationData() {
  for (const sid of STATION_IDS) {
    const buildings = dbAll('SELECT * FROM buildings WHERE station_id = ?', sid);
    stationBuildings[sid] = buildings;

    const inv = dbAll('SELECT * FROM inventory WHERE station_id = ?', sid);
    stationInventory[sid] = inv;

    sensorStates[sid] = new SensorState(sid);
  }
}

// Periodic DB flush — deterministic counter, not random
let tickCounter = 0;
const FLUSH_INTERVAL = 10; // flush every N ticks

function tick() {
  tickCounter++;

  for (const stationId of STATION_IDS) {
    const state = sensorStates[stationId];

    state.drift();

    let anomaly = null;
    if (Math.random() < ANOMALY_PROBABILITY) {
      anomaly = state.applyAnomaly();
    }

    const energyReading = generateEnergyReading(stationId, state);
    const envReading = generateEnvReading(stationId, state);
    const infraReadings = generateInfraReading(stationId, state, stationBuildings[stationId]);
    const logisticsReadings = generateLogisticsReading(stationId, stationInventory[stationId]);

    // Update inventory state
    for (const log of logisticsReadings) {
      const invItem = stationInventory[stationId].find(i => i.item === log.item);
      if (invItem) {
        invItem.current_qty = log.quantity;
        invItem.days_remaining = log.daysRemaining;
        dbRun('UPDATE inventory SET current_qty = ?, days_remaining = ? WHERE id = ?',
          log.quantity, log.daysRemaining, invItem.id);
      }
    }

    // Ingest readings (single boundary function)
    if (blackoutActive) {
      const energyPriority = classifyPriority('energy', energyReading);
      queueReading(energyReading, energyPriority);

      const envPriority = classifyPriority('environment', envReading);
      queueReading(envReading, envPriority);

      for (const ir of infraReadings) {
        queueReading(ir, classifyPriority('infrastructure', ir));
      }
      for (const lr of logisticsReadings) {
        queueReading(lr, classifyPriority('logistics', lr));
      }
    } else {
      ingestReading(energyReading);
      ingestReading(envReading);
      for (const ir of infraReadings) ingestReading(ir);
      for (const lr of logisticsReadings) ingestReading(lr);
    }

    if (anomaly) {
      console.log(`[SIM] ${stationId} ANOMALY: ${anomaly.type}`);
    }
  }

  // Periodic flush to disk (deterministic)
  if (tickCounter % FLUSH_INTERVAL === 0) {
    saveDatabase();
    console.log(`[DB] Flushed to disk (tick ${tickCounter}, ${FLUSH_INTERVAL}-tick interval)`);
  }
}

function classifyPriority(type, reading) {
  if (type === 'energy') {
    if (reading.fuelPercent < 15) return 'P0';
    if (reading.batteryPercent < 20) return 'P0';
    if (reading.generatorTempC > 100) return 'P0';
  }
  if (type === 'environment' && reading.windSpeedKmh > 100) return 'P0';
  if (type === 'infrastructure' && !reading.powerOn) return 'P0';
  if (type === 'logistics' && reading.daysRemaining < 7) return 'P0';
  if (type === 'energy' && reading.fuelPercent < 30) return 'P1';
  if (type === 'environment' && reading.windSpeedKmh > 70) return 'P1';
  if (type === 'energy' && reading.generatorTempC > 95) return 'P1';
  if (type === 'logistics' && reading.daysRemaining < 21) return 'P1';
  return 'P2';
}

/**
 * Start the simulator engine
 */
export function startSimulator() {
  if (intervalId) {
    console.log('[SIM] Already running');
    return;
  }

  loadStationData();

  const speed = parseInt(process.env.SIMULATOR_SPEED || '1', 10);
  const intervalMs = TICK_INTERVAL_MS / speed;

  console.log(`[SIM] Starting engine — ${intervalMs}ms interval (${speed}x speed), ${ANOMALY_PROBABILITY * 100}% anomaly rate`);

  tick();
  intervalId = setInterval(tick, intervalMs);
}

/**
 * Stop the simulator engine
 */
export function stopSimulator() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    saveDatabase();
    console.log('[SIM] Stopped');
  }
}

export { sensorStates };

export function adjustSensorState(stationId, property, delta) {
  if (sensorStates[stationId] && sensorStates[stationId][property] !== undefined) {
    const min = property === 'fuelPercent' ? 5 : 0;
    const max = (property === 'fuelPercent' || property === 'batteryPercent') ? 100 : 150;
    sensorStates[stationId][property] = Math.max(min, Math.min(max, sensorStates[stationId][property] + delta));
  }
}
