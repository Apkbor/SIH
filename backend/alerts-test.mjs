// alerts-test.mjs — verify alerts API and socket flow
import http from 'http';
import { io } from 'socket.io-client';

const BASE = 'http://localhost:3001';

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get(BASE + path, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(data); } });
    }).on('error', reject);
  });
}

async function main() {
  console.log('=== ALERTS API TEST ===\n');

  // 1. Check BHARATI alerts
  console.log('1. GET /api/alerts?stationId=BHARATI&unresolved=true');
  const bharatiAlerts = await httpGet('/api/alerts?stationId=BHARATI&unresolved=true');
  console.log(`   Count: ${bharatiAlerts.length}`);
  if (bharatiAlerts.length > 0) {
    console.log('   Sample alert:', JSON.stringify(bharatiAlerts[0], null, 2));
  }

  // 2. Check MAITRI alerts
  console.log('\n2. GET /api/alerts?stationId=MAITRI&unresolved=true');
  const maitriAlerts = await httpGet('/api/alerts?stationId=MAITRI&unresolved=true');
  console.log(`   Count: ${maitriAlerts.length}`);
  if (maitriAlerts.length > 0) {
    console.log('   Sample alert:', JSON.stringify(maitriAlerts[0], null, 2));
  }

  // 3. Check all unresolved
  console.log('\n3. GET /api/alerts?unresolved=true');
  const allAlerts = await httpGet('/api/alerts?unresolved=true');
  console.log(`   Total unresolved: ${allAlerts.length}`);

  // 4. Verify alert fields match frontend expectations
  console.log('\n4. Field check (first alert):');
  if (allAlerts.length > 0) {
    const a = allAlerts[0];
    const required = ['id', 'stationId', 'priority', 'category', 'title', 'description', 'value', 'threshold', 'timestamp', 'acknowledged', 'resolved'];
    required.forEach(f => {
      const has = a[f] !== undefined && a[f] !== null;
      console.log(`   ${has ? '✓' : '✗'} ${f}: ${a[f] !== undefined ? JSON.stringify(a[f]).slice(0, 50) : 'MISSING'}`);
    });
  } else {
    console.log('   No alerts to check!');
  }

  // 5. Socket.io test — connect and check seed flow
  console.log('\n5. Socket.io connection test:');
  const socket = io(BASE, { transports: ['websocket'] });

  let socketConnected = false;
  let alertsReceived = 0;

  socket.on('connect', () => {
    socketConnected = true;
    console.log('   ✓ Socket connected:', socket.id);

    // Subscribe to alerts for both stations
    socket.emit('subscribe:alerts', { stationId: 'BHARATI' });
    socket.emit('subscribe:alerts', { stationId: 'MAITRI' });

    // Seed existing alerts (this is what the frontend fix does)
    const existing = allAlerts;
    console.log(`   Seeding ${existing.length} existing alerts...`);
    socket.emit('alerts:seed', existing);
  });

  socket.on('alert', (alert) => {
    alertsReceived++;
    if (alertsReceived <= 3) {
      console.log(`   ← Received alert #${alertsReceived}: [${alert.priority}] ${alert.title}`);
    }
  });

  await new Promise(r => setTimeout(r, 3000));

  socket.disconnect();
  console.log(`\n   Total alerts received via socket: ${alertsReceived}`);
  console.log(`   Socket connected: ${socketConnected}`);

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`BHARATI alerts: ${bharatiAlerts.length}`);
  console.log(`MAITRI alerts: ${maitriAlerts.length}`);
  console.log(`Total alerts: ${allAlerts.length}`);
  console.log(`Socket seed flow: ${alertsReceived > 0 ? 'WORKING' : 'NO ALERTS RECEIVED (will show empty page)'}`);
}

main().catch(e => { console.error(e); process.exit(1); });
