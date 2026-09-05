/**
 * Chat Module — message storage, retrieval, and Socket.io handlers
 */

import { getDb, dbRun } from '../db/index.js';
import { getIoServer } from '../simulator/engine.js';

const DEFAULT_CHANNELS = [
  { id: 'ops-bharati', label: 'Base ↔ Bharati', icon: '📡' },
  { id: 'ops-maitri', label: 'Base ↔ Maitri', icon: '📡' },
  { id: 'engineering', label: 'Engineering', icon: '⚙' },
  { id: 'emergency', label: 'Emergency Channel', icon: '🔴' },
];

const BOT_NAME = 'NCPOR-Ops-Bot';

// ---- Storage ----

export function saveMessage(channel, sender, content, msgType = 'user', stationId = null) {
  const id = `M-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const ts = new Date().toISOString();

  try {
    dbRun(
      'INSERT INTO messages (id, channel, sender, content, msg_type, station_id, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
      id, channel, sender, content, msgType, stationId || '', ts
    );
  } catch (err) {
    console.error('[CHAT] Failed to save message:', err);
  }

  const record = { id, channel, sender, content, msg_type: msgType, station_id: stationId, timestamp: ts };

  // Broadcast to channel room
  const io = getIoServer();
  if (io) {
    io.to(`chat:${channel}`).emit('message:new', record);
  }

  return record;
}

export function getMessages(channel, limit = 100) {
  try {
    const db = getDb();
    return dbAllFromDb(
      db,
      'SELECT * FROM messages WHERE channel = ? ORDER BY timestamp DESC LIMIT ?',
      channel, limit
    ).reverse();
  } catch (err) {
    console.error('[CHAT] Failed to fetch messages:', err);
    return [];
  }
}

export function getRecentMessages(limit = 100) {
  try {
    const db = getDb();
    return dbAllFromDb(
      db,
      'SELECT * FROM messages ORDER BY timestamp DESC LIMIT ?',
      limit
    ).reverse();
  } catch (err) {
    console.error('[CHAT] Failed to fetch recent messages:', err);
    return [];
  }
}

export function getChannels() {
  return DEFAULT_CHANNELS;
}

export function getAllMessages(limit = 200) {
  try {
    const db = getDb();
    return dbAllFromDb(
      db,
      'SELECT * FROM messages ORDER BY timestamp DESC LIMIT ?',
      limit
    ).reverse();
  } catch (err) {
    console.error('[CHAT] Failed to fetch all messages:', err);
    return [];
  }
}

export function broadcastMessage(sender, content, msgType = 'user', stationId) {
  const results = [];
  for (const ch of DEFAULT_CHANNELS) {
    const msg = saveMessage(ch.id, sender, content, msgType, stationId);
    results.push(msg);
  }
  return results;
}

// ---- Auto-responder ----

const BOT_REPLIES = {
  emergency: [
    'Acknowledged. Dispatching emergency response team.',
    'All stations notified. Stand by for confirmation.',
    'Emergency protocol activated. Monitor all channels.',
    'Received. Updating incident log. Hold position.',
  ],
  engineering: [
    'Engineering team notified. Assessing generator systems.',
    'Switching to diagnostic mode. Stand by.',
    'Maintenance schedule updated. Check ticket queue.',
  ],
  'ops-bharati': [
    'Bharati ops confirmed. Systems nominal.',
    'Received. Updating Bharati station status.',
  ],
  'ops-maitri': [
    'Maitri ops confirmed. Systems nominal.',
    'Received. Updating Maitri station status.',
  ],
};

export function getBotReply(channel, incomingMessage) {
  const replies = BOT_REPLIES[channel] || ['Message acknowledged by NCPOR Operations Center.'];
  return replies[Math.floor(Math.random() * replies.length)];
}

// ---- Socket.io registration ----

export function registerChatHandlers(socket) {
  socket.on('chat:subscribe', ({ channel }) => {
    socket.join(`chat:${channel}`);
    console.log(`[CHAT] Socket ${socket.id} joined channel: ${channel}`);
  });

  socket.on('chat:message', ({ channel, sender, content }) => {
    // Save and broadcast user message
    const msg = saveMessage(channel, sender, content, 'user');

    // Auto-reply in emergency and engineering channels
    if (channel === 'emergency' || channel === 'engineering') {
      const delay = channel === 'emergency' ? 2000 : 3500;
      setTimeout(() => {
        const reply = getBotReply(channel, content);
        const botMsg = saveMessage(channel, BOT_NAME, reply, 'bot');
      }, delay);
    }
  });
}

// ---- SQL helpers ----

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
