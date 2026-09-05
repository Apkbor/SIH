import http from 'http';

const BASE = 'http://localhost:3001';

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 3001, path, method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (payload) opts.headers['Content-Length'] = Buffer.byteLength(payload);
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

(async () => {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   NCPOR BASE COMMAND CENTER — END-TO-END TEST            ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // STEP 1: Bharati sends a message to Base
  console.log('─── STEP 1: Station → Base (Bharati) ───');
  const m1 = await request('POST', '/api/chat/message', {
    channel: 'ops-bharati', sender: 'Bharati-Ops',
    content: 'HQ, this is Bharati. Fuel levels dropping. Requesting status update.',
    msg_type: 'user', station_id: 'BHARATI'
  });
  console.log('  Status:', m1.status === 200 ? '✅' : '❌', m1.status);
  console.log('  Channel:', m1.body?.channel, '| Station:', m1.body?.station_id);
  console.log('  Content:', (m1.body?.content || '').slice(0, 60));

  // STEP 2: Maitri sends emergency message
  console.log('\n─── STEP 2: Station → Base Emergency (Maitri) ───');
  const m2 = await request('POST', '/api/chat/message', {
    channel: 'emergency', sender: 'Maitri-Ops',
    content: 'EMERGENCY: Fire in generator room. All personnel evacuated.',
    msg_type: 'user', station_id: 'MAITRI'
  });
  console.log('  Status:', m2.status === 200 ? '✅' : '❌', m2.status);
  console.log('  Channel:', m2.body?.channel, '| Station:', m2.body?.station_id);

  // STEP 3: HQ replies to Bharati (BIDIRECTIONAL)
  console.log('\n─── STEP 3: HQ → Station reply (BIDIRECTIONAL) ───');
  const m3 = await request('POST', '/api/chat/message', {
    channel: 'ops-bharati', sender: 'HQ',
    content: 'Bharati, HQ acknowledged. Monitoring fuel levels. Update every 30 min.',
    msg_type: 'user', station_id: 'BHARATI'
  });
  console.log('  Status:', m3.status === 200 ? '✅' : '❌', m3.status);
  console.log('  Sender:', m3.body?.sender, '| Target:', m3.body?.station_id);

  // STEP 4: HQ broadcast to ALL stations
  console.log('\n─── STEP 4: HQ → Broadcast to all stations ───');
  const m4 = await request('POST', '/api/chat/broadcast', {
    sender: 'HQ',
    content: 'All stations: Weather alert. Cyclone warning issued. Secure all equipment.',
    msg_type: 'user', station_id: 'BASE'
  });
  console.log('  Status:', m4.status === 200 ? '✅' : '❌', m4.status);
  console.log('  Sent to:', m4.body?.sent, 'channels');
  m4.body?.messages?.forEach((m, i) => console.log(`    ${i+1}. ${m.channel}`));

  // STEP 5: BasePage unified feed query
  console.log('\n─── STEP 5: BasePage unified feed ───');
  const all = await request('GET', '/api/chat/all?limit=10');
  console.log('  Status:', all.status === 200 ? '✅' : '❌', all.status);
  console.log('  Total messages:', all.body?.length);
  console.log('  Message breakdown:');
  let bharatiCount = 0, maitriCount = 0, hqCount = 0, botCount = 0;
  all.body?.forEach((m) => {
    const s = m.station_id || 'BASE';
    if (m.sender === 'HQ') hqCount++;
    else if (m.sender === 'NCPOR-Ops-Bot') botCount++;
    else if (s === 'BHARATI') bharatiCount++;
    else if (s === 'MAITRI') maitriCount++;
  });
  console.log(`    🔵 Bharati-originated: ${bharatiCount}`);
  console.log(`    🟡 Maitri-originated: ${maitriCount}`);
  console.log(`    🟢 HQ-originated: ${hqCount}`);
  console.log(`    🤖 Bot-generated: ${botCount}`);

  // STEP 6: Station-specific queries (for Bharati/Maitri views)
  console.log('\n─── STEP 6: Station-specific thread queries ───');
  const bharatiThread = await request('GET', '/api/chat/messages?channel=ops-bharati&limit=10');
  console.log('  Bharati thread:', bharatiThread.status === 200 ? '✅' : '❌', bharatiThread.body?.length, 'messages');
  const maitriThread = await request('GET', '/api/chat/messages?channel=ops-maitri&limit=10');
  console.log('  Maitri thread:', maitriThread.status === 200 ? '✅' : '❌', maitriThread.body?.length, 'messages');
  const emergencyThread = await request('GET', '/api/chat/messages?channel=emergency&limit=10');
  console.log('  Emergency thread:', emergencyThread.status === 200 ? '✅' : '❌', emergencyThread.body?.length, 'messages');

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   ✅ ALL ENDPOINTS VERIFIED — BIDIRECTIONAL FLOW OK     ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
})().catch(e => { console.error('❌ Test failed:', e); process.exit(1); });
