/**
 * E2E Verification Script for Antarctic Digital Twin Platform
 * Tests all backend API endpoints, data correctness, and simulator functionality
 */

import http from 'http';
import { io as Client } from 'socket.io-client';

const BASE = 'http://localhost:3001';
const results = [];
let passCount = 0;
let failCount = 0;

function request(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    }).on('error', reject);
  });
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function assert(test, name, detail) {
  if (test) {
    console.log(`  ✅ ${name}`);
    passCount++;
  } else {
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
    failCount++;
  }
  results.push({ pass: test, name, detail });
}

// ============================================================
// 1. HEALTH CHECK
// ============================================================
console.log('\n━━━ 1. HEALTH CHECK ━━━');

try {
  const health = await request('/api/health');
  assert(health.status === 200, 'Health endpoint returns 200', `got ${health.status}`);
  assert(health.body.status === 'ok', 'Health status is "ok"', JSON.stringify(health.body.status));
  assert(health.body.simulator === 'running', 'Simulator is running', JSON.stringify(health.body.simulator));
  assert(health.body.timestamp !== undefined, 'Timestamp present');
  console.log(`  📋 Backend response: ${JSON.stringify(health.body)}`);
} catch (e) {
  assert(false, 'Health endpoint reachable', e.message);
}

// ============================================================
// 2. STATIONS
// ============================================================
console.log('\n━━━ 2. STATIONS ━━━');

try {
  const stations = await request('/api/stations');
  assert(stations.status === 200, 'Stations endpoint returns 200');
  assert(Array.isArray(stations.body), 'Stations is array');
  assert(stations.body.length >= 2, 'At least 2 stations', `got ${stations.body.length}`);
  const ids = stations.body.map(s => s.id);
  assert(ids.includes('BHARATI'), 'BHARATI station exists');
  assert(ids.includes('MAITRI'), 'MAITRI station exists');
  console.log(`  📋 Stations: ${JSON.stringify(stations.body.map(s => s.id))}`);
} catch (e) {
  assert(false, 'Stations endpoint', e.message);
}

// ============================================================
// 3. BUILDINGS
// ============================================================
console.log('\n━━━ 3. BUILDINGS ━━━');

try {
  const bhaBuildings = await request('/api/stations/BHARATI/buildings');
  assert(bhaBuildings.status === 200, 'Bharati buildings endpoint 200');
  assert(bhaBuildings.body.length >= 5, 'Bharati has multiple buildings', `got ${bhaBuildings.body.length}`);
  const bhaIds = bhaBuildings.body.map(b => b.id);
  assert(bhaIds.includes('BHA-GEN'), 'BHA-GEN exists');
  assert(bhaIds.includes('BHA-LAB1'), 'BHA-LAB1 exists');
  assert(bhaBuildings.body[0].critical !== undefined, 'Buildings have critical flag');
  console.log(`  📋 Bharati: ${bhaIds.join(', ')}`);

  const maiBuildings = await request('/api/stations/MAITRI/buildings');
  assert(maiBuildings.status === 200, 'Maitri buildings endpoint 200');
  assert(maiBuildings.body.length >= 5, 'Maitri has multiple buildings');
  console.log(`  📋 Maitri: ${maiBuildings.body.map(b => b.id).join(', ')}`);
} catch (e) {
  assert(false, 'Buildings endpoints', e.message);
}

// ============================================================
// 4. LATEST READINGS
// ============================================================
console.log('\n━━━ 4. LATEST READINGS ━━━');

try {
  const latest = await request('/api/stations/BHARATI/latest');
  assert(latest.status === 200, 'Latest readings endpoint 200');
  assert(latest.body.energy !== undefined, 'Energy reading exists');
  assert(latest.body.environment !== undefined, 'Environment reading exists');
  assert(latest.body.infrastructure !== undefined, 'Infrastructure reading exists');
  assert(latest.body.logistics !== undefined, 'Logistics reading exists');

  const e = latest.body.energy;
  assert(e.stationId === 'BHARATI', 'Energy reading has stationId');
  assert(typeof e.fuelPercent === 'number', 'fuelPercent is number', `got ${typeof e.fuelPercent}`);
  assert(e.fuelPercent >= 0 && e.fuelPercent <= 100, 'fuelPercent in range [0,100]', `got ${e.fuelPercent}`);
  assert(typeof e.batteryPercent === 'number', 'batteryPercent is number');
  assert(typeof e.generatorLoad === 'number', 'generatorLoad is number');
  assert(typeof e.solarOutput === 'number', 'solarOutput is number');
  assert(typeof e.generatorTempC === 'number', 'generatorTempC is number');
  assert(e.type === 'energy', 'Type is energy');
  assert(e.timestamp !== undefined, 'Timestamp present');
  console.log(`  📋 Energy: fuel=${e.fuelPercent.toFixed(1)}% bat=${e.batteryPercent.toFixed(1)}% load=${e.generatorLoad.toFixed(1)}% solar=${e.solarOutput.toFixed(1)}kW temp=${e.generatorTempC.toFixed(1)}°C`);

  const env = latest.body.environment;
  assert(env.stationId === 'BHARATI', 'Environment has stationId');
  assert(typeof env.temperatureC === 'number', 'temperatureC is number');
  assert(typeof env.windSpeedKmh === 'number', 'windSpeedKmh is number');
  assert(typeof env.humidityPercent === 'number', 'humidityPercent is number');
  assert(env.temperatureC >= -60 && env.temperatureC <= 10, 'Temp in Antarctic range', `got ${env.temperatureC}°C`);
  console.log(`  📋 Env: temp=${env.temperatureC.toFixed(1)}°C wind=${env.windSpeedKmh.toFixed(1)}km/h hum=${env.humidityPercent.toFixed(0)}%`);

  const infra = latest.body.infrastructure;
  assert(Array.isArray(infra), 'Infrastructure is array');
  assert(infra.length > 0, 'Infrastructure has buildings');
  assert(infra[0].buildingId !== undefined, 'Infra reading has buildingId');
  console.log(`  📋 Infrastructure: ${infra.length} buildings`);

  const log = latest.body.logistics;
  assert(Array.isArray(log), 'Logistics is array');
  assert(log.length > 0, 'Logistics has items');
  console.log(`  📋 Logistics: ${log.length} items, first: ${log[0].item} (${log[0].daysRemaining.toFixed(1)}d)`);
} catch (e) {
  assert(false, 'Latest readings', e.message);
}

// ============================================================
// 5. INVENTORY
// ============================================================
console.log('\n━━━ 5. INVENTORY ━━━');

try {
  const inv = await request('/api/stations/BHARATI/inventory');
  assert(inv.status === 200, 'Inventory endpoint 200');
  assert(inv.body.length >= 5, 'Multiple inventory items');
  assert(inv.body[0].item !== undefined, 'Has item field');
  assert(inv.body[0].days_remaining !== undefined, 'Has days_remaining');
  assert(inv.body[0].current_qty !== undefined, 'Has current_qty');
  console.log(`  📋 Bharati inventory: ${inv.body.map(i => `${i.item}(${i.days_remaining.toFixed(0)}d)`).join(', ')}`);
} catch (e) {
  assert(false, 'Inventory', e.message);
}

// ============================================================
// 6. HISTORICAL READINGS
// ============================================================
console.log('\n━━━ 6. HISTORICAL READINGS ━━━');

try {
  const history = await request('/api/stations/BHARATI/readings?type=energy&limit=10');
  assert(history.status === 200, 'History endpoint 200');
  assert(Array.isArray(history.body), 'History is array');
  assert(history.body.length >= 1, 'Has at least 1 reading');
  if (history.body.length > 1) {
    assert(history.body[0].timestamp !== history.body[1].timestamp, 'Multiple timestamps (data over time)');
  }
  console.log(`  📋 Energy history: ${history.body.length} readings`);
} catch (e) {
  assert(false, 'History', e.message);
}

// ============================================================
// 7. ALERTS
// ============================================================
console.log('\n━━━ 7. ALERTS ━━━');

try {
  const alerts = await request('/api/alerts?stationId=BHARATI');
  assert(alerts.status === 200, 'Alerts endpoint 200');
  assert(Array.isArray(alerts.body), 'Alerts is array');
  console.log(`  📋 BHARATI alerts: ${alerts.body.length} total`);

  const unresolved = await request('/api/alerts?stationId=BHARATI&unresolved=true');
  assert(unresolved.status === 200, 'Unresolved alerts 200');
  console.log(`  📋 Unresolved: ${unresolved.body.length}`);
} catch (e) {
  assert(false, 'Alerts', e.message);
}

// ============================================================
// 8. COMPARE ENDPOINT
// ============================================================
console.log('\n━━━ 8. COMPARE ENDPOINT ━━━');

try {
  const compare = await request('/api/compare');
  assert(compare.status === 200, 'Compare endpoint 200');
  assert(compare.body.BHARATI !== undefined, 'Has BHARATI data');
  assert(compare.body.MAITRI !== undefined, 'Has MAITRI data');
  assert(compare.body.BHARATI.energy !== undefined, 'BHARATI has energy');
  assert(compare.body.MAITRI.energy !== undefined, 'MAITRI has energy');
  assert(typeof compare.body.BHARATI.alertCount === 'number', 'Has alertCount');
  console.log(`  📋 BHARATI fuel: ${compare.body.BHARATI.energy?.fuelPercent?.toFixed(1)}%`);
  console.log(`  📋 MAITRI fuel: ${compare.body.MAITRI.energy?.fuelPercent?.toFixed(1)}%`);
} catch (e) {
  assert(false, 'Compare', e.message);
}

// ============================================================
// 9. FORECAST ENDPOINT
// ============================================================
console.log('\n━━━ 9. FORECAST ENDPOINT ━━━');

try {
  const forecast = await request('/api/stations/BHARATI/forecast');
  assert(forecast.status === 200, 'Forecast endpoint 200');
  assert(forecast.body.energy !== undefined, 'Has energy forecast');
  assert(Array.isArray(forecast.body.energy), 'Energy forecast is array');
  assert(forecast.body.logistics !== undefined, 'Has logistics forecast');
  assert(forecast.body.environment !== undefined, 'Has environment forecast');
  if (forecast.body.energy.length > 0) {
    console.log(`  📋 Energy forecast[0]: ${forecast.body.energy[0].title} = ${forecast.body.energy[0].value}`);
  }
} catch (e) {
  assert(false, 'Forecast', e.message);
}

// ============================================================
// 10. WHAT-IF SIMULATION
// ============================================================
console.log('\n━━━ 10. WHAT-IF SIMULATION ━━━');

try {
  const sim = await post('/api/simulate/generator-failure', { stationId: 'BHARATI' });
  assert(sim.status === 200, 'Simulation endpoint 200');
  assert(sim.body.buildingsAffected !== undefined, 'Has buildingsAffected');
  assert(sim.body.criticalBuildingsAffected !== undefined, 'Has criticalBuildingsAffected');
  assert(sim.body.batteryCoverageMinutes !== undefined, 'Has batteryCoverageMinutes');
  assert(sim.body.backupCanCover !== undefined, 'Has backupCanCover');
  console.log(`  📋 Gen failure: ${sim.body.buildingsAffected} buildings, ${sim.body.criticalBuildingsAffected} critical, ${sim.body.batteryCoverageMinutes}min battery`);
  assert(!sim.body.realStateModified, 'Real state NOT modified');
} catch (e) {
  assert(false, 'Simulation', e.message);
}

// ============================================================
// 11. SOCKET.IO REAL-TIME
// ============================================================
console.log('\n━━━ 11. SOCKET.IO REAL-TIME ━━━');

try {
  const socket = Client(BASE, { transports: ['websocket'] });

  let readingsReceived = 0;
  let alertsReceived = 0;
  let energyReadings = [];

  await new Promise((resolve) => {
    socket.on('connect', () => {
      console.log(`  📡 Socket connected: ${socket.id}`);
      socket.emit('subscribe:sensor', { stationId: 'BHARATI', type: 'energy' });
      socket.emit('subscribe:sensor', { stationId: 'BHARATI', type: 'environment' });
      socket.emit('subscribe:alerts', { stationId: 'BHARATI' });
      socket.emit('subscribe:blackout');
      resolve();
    });

    socket.on('reading', (data) => {
      readingsReceived++;
      if (data.type === 'energy') {
        energyReadings.push(data);
      }
    });

    socket.on('alert', (data) => {
      alertsReceived++;
      console.log(`  🚨 Alert received: [${data.priority}] ${data.title}`);
    });

    socket.on('blackout:status', (data) => {
      console.log(`  ⚫ Blackout status: ${JSON.stringify(data)}`);
    });
  });

  // Wait for some readings
  await new Promise(r => setTimeout(r, 6000));

  assert(readingsReceived >= 2, 'Received multiple readings', `got ${readingsReceived}`);
  assert(energyReadings.length >= 1, 'Received energy readings');

  if (energyReadings.length >= 2) {
    const e0 = energyReadings[0];
    const e1 = energyReadings[energyReadings.length - 1];
    console.log(`  📋 Energy readings received: ${energyReadings.length}`);
    console.log(`  📋 First: fuel=${e0.fuelPercent?.toFixed(1)}% → Last: fuel=${e1.fuelPercent?.toFixed(1)}%`);
    // Values should be drifting, not identical
    const fuelDrifting = energyReadings.some((r, i) => i > 0 && r.fuelPercent !== energyReadings[i-1].fuelPercent);
    assert(fuelDrifting, 'Fuel values drift over time (not static)');
  }

  socket.disconnect();
  console.log(`  📋 Total readings: ${readingsReceived}, alerts: ${alertsReceived}`);
} catch (e) {
  assert(false, 'Socket.io', e.message);
}

// ============================================================
// SUMMARY
// ============================================================
console.log('\n' + '═'.repeat(50));
console.log(`  RESULTS: ${passCount} passed, ${failCount} failed`);
console.log('═'.repeat(50));

if (failCount > 0) {
  console.log('\nFailed tests:');
  results.filter(r => !r.pass).forEach(r => console.log(`  ❌ ${r.name}: ${r.detail}`));
}

process.exit(failCount > 0 ? 1 : 0);
