/**
 * Active Notifications Tracker — dedup & escalation engine
 *
 * Prevents duplicate SMS for the same underlying issue by tracking
 * alert signatures in a persistent active_notifications table.
 *
 * Lifecycle:
 *   NEW      → first time this signature appears → send SMS, mark ACTIVE
 *   ACTIVE   → signature still occurring → suppress SMS, update last_seen
 *   ESCALATE → active past escalation threshold → send ONGOING SMS, reset timer
 *   RESOLVED → condition normalized → mark resolved, optionally log
 */

import { getDb, dbRun } from '../db/index.js';
import { composeSMSBody, sendSMS } from '../services/smsService.js';
import { getPriorityConfig, getRecipientForPriority } from '../config/priorityConfig.js';
import { getIoServer as getIo } from '../simulator/engine.js';

// Local SQL helpers using sql.js step/bind API
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

// In-memory cache of active signatures (supplements DB for fast lookup)
const activeCache = new Map();

// ============================================================
// SIGNATURE
// ============================================================

/**
 * Build a deterministic signature for an alert.
 * Two alerts with the same signature are the same underlying issue.
 *
 * Strategy: normalize the alert title to extract the specific issue type
 * within the category. This allows fuel and battery alerts (both "energy")
 * to be tracked separately.
 */
export function buildSignature(alert) {
  const title = (alert.title || alert.category || 'unknown').toLowerCase();
  const category = (alert.category || 'unknown').toLowerCase();

  // Extract specific issue type from title
  let issueType = category;

  if (title.includes('fuel')) issueType = 'fuel';
  else if (title.includes('battery')) issueType = 'battery';
  else if (title.includes('generator')) issueType = 'generator';
  else if (title.includes('solar')) issueType = 'solar';
  else if (title.includes('wind')) issueType = 'wind';
  else if (title.includes('temperature') || title.includes('cold')) issueType = 'temperature';
  else if (title.includes('power loss') || title.includes('power_outage')) issueType = 'power_loss';
  else if (title.includes('supply') || title.includes('inventory')) issueType = 'supply';
  else if (title.includes('medical')) issueType = 'medical';

  // Include building/equipment ID if present for infrastructure alerts
  if (alert.buildingId) {
    issueType = `${issueType}:${alert.buildingId}`;
  }

  return `${alert.stationId}:${issueType}:${alert.priority}`;
}

// ============================================================
// DB HELPERS
// ============================================================

function upsertActiveNotification(signature, alert, status = 'active') {
  const db = getDb();
  const now = new Date().toISOString();

  const existing = dbOneFromDb(db,
    'SELECT * FROM active_notifications WHERE signature = ?', signature);

  if (existing) {
    dbRun(
      `UPDATE active_notifications
       SET last_seen = ?, occurrence_count = occurrence_count + 1,
           notification_count = notification_count + ?,
           status = ?,
           alert_id = ?
       WHERE signature = ?`,
      now,
      status === 'notified' ? 1 : 0,
      status === 'notified' ? 'active' : existing.status,
      alert.id,
      signature
    );
    return dbOneFromDb(db, 'SELECT * FROM active_notifications WHERE signature = ?', signature);
  } else {
    dbRun(
      `INSERT INTO active_notifications
       (signature, station_id, category, priority, alert_id, status, first_seen, last_seen,
        occurrence_count, notification_count, last_sms_sent_at, escalated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      signature, alert.stationId, alert.category, alert.priority, alert.id, status,
      now, now, status === 'notified' ? 1 : 0,
      status === 'notified' ? now : null,
      0
    );
    return dbOneFromDb(db, 'SELECT * FROM active_notifications WHERE signature = ?', signature);
  }
}

function markResolved(signature) {
  const db = getDb();
  dbRun(
    'UPDATE active_notifications SET status = ?, resolved_at = ? WHERE signature = ?',
    'resolved', new Date().toISOString(), signature
  );
  activeCache.delete(signature);
}

function getActiveEntry(signature) {
  const db = getDb();
  return dbOneFromDb(db, 'SELECT * FROM active_notifications WHERE signature = ? AND status != ?', signature, 'resolved');
}

function getAllActive() {
  const db = getDb();
  return dbAllFromDb(db, 'SELECT * FROM active_notifications WHERE status != ?', 'resolved');
}

// ============================================================
// RESOLUTION DETECTION
// ============================================================

/**
 * Check if an alert condition has resolved by looking at the latest sensor readings.
 * Returns true if the underlying condition appears to have cleared.
 */
function detectResolution(alert) {
  const db = getDb();

  if (alert.category === 'energy') {
    if (alert.title && alert.title.includes('Fuel')) {
      const row = dbOneFromDb(db,
        'SELECT data FROM readings WHERE station_id = ? AND type = ? ORDER BY timestamp DESC LIMIT 1',
        alert.stationId, 'energy');
      if (row && row.data) {
        const reading = JSON.parse(row.data);
        // Check if fuel has recovered above the critical threshold (with 5% buffer)
        if (reading.fuelPercent > 20) return true;
      }
    }
    if (alert.title && alert.title.includes('Battery')) {
      const row = dbOneFromDb(db,
        'SELECT data FROM readings WHERE station_id = ? AND type = ? ORDER BY timestamp DESC LIMIT 1',
        alert.stationId, 'energy');
      if (row && row.data) {
        const reading = JSON.parse(row.data);
        if (reading.batteryPercent > 30) return true;
      }
    }
    if (alert.title && alert.title.includes('Generator') && alert.title.includes('Overheat')) {
      const row = dbOneFromDb(db,
        'SELECT data FROM readings WHERE station_id = ? AND type = ? ORDER BY timestamp DESC LIMIT 1',
        alert.stationId, 'energy');
      if (row && row.data) {
        const reading = JSON.parse(row.data);
        if (reading.generatorTempC < 85) return true;
      }
    }
  }

  if (alert.category === 'environment' && alert.title && alert.title.includes('Wind')) {
    const row = dbOneFromDb(db,
      'SELECT data FROM readings WHERE station_id = ? AND type = ? ORDER BY timestamp DESC LIMIT 1',
      alert.stationId, 'environment');
    if (row && row.data) {
      const reading = JSON.parse(row.data);
      if (reading.windSpeedKmh < 60) return true;
    }
  }

  if (alert.category === 'logistics') {
    const row = dbOneFromDb(db,
      'SELECT * FROM inventory WHERE station_id = ? AND item LIKE ? ORDER BY days_remaining DESC LIMIT 1',
      alert.stationId, `%${alert.title.replace(/^(CRITICAL:\s*|Low Supply:\s*)/, '').trim()}%`);
    if (row && row.days_remaining > 15) return true;
  }

  if (alert.category === 'infrastructure' && alert.buildingId) {
    const row = dbOneFromDb(db,
      'SELECT data FROM readings WHERE station_id = ? AND building_id = ? AND type = ? ORDER BY timestamp DESC LIMIT 1',
      alert.stationId, alert.buildingId, 'infrastructure');
    if (row && row.data) {
      const reading = JSON.parse(row.data);
      if (reading.powerOn) return true;
    }
  }

  return false;
}

// ============================================================
// MAIN: CHECK AND DISPATCH
// ============================================================

/**
 * Core dedup + dispatch function.
 * Call this instead of sending SMS directly.
 *
 * Returns { action: 'sent'|'suppressed'|'escalated'|'resolved', record: {} }
 */
export async function checkAndDispatch(alert) {
  const signature = buildSignature(alert);
  const priorityCfg = getPriorityConfig(alert.priority);
  const recipient = getRecipientForPriority(alert.priority);
  const now = Date.now();
  const nowISO = new Date().toISOString();

  // Check if this signature is already active
  let activeEntry = getActiveEntry(signature);

  if (activeEntry) {
    // --- SIGNATURE IS ALREADY ACTIVE ---
    const firstSeen = new Date(activeEntry.first_seen).getTime();
    const lastSeen = new Date(activeEntry.last_seen).getTime();
    const lastSms = activeEntry.last_sms_sent_at ? new Date(activeEntry.last_sms_sent_at).getTime() : 0;
    const activeDuration = now - firstSeen;
    const escalationMs = priorityCfg.escalationMinutes * 60 * 1000;
    const cooldownMs = priorityCfg.cooldownMinutes * 60 * 1000;

    // Check if condition resolved
    const resolved = detectResolution(alert);

    if (resolved) {
      markResolved(signature);
      console.log(`[DEDUP] RESOLVED: ${signature} (was active for ${Math.round(activeDuration / 60000)}min)`);

      return {
        action: 'resolved',
        signature,
        duration: Math.round(activeDuration / 60000),
      };
    }

    // Check if we should send an escalation follow-up
    if (activeDuration >= escalationMs && !activeEntry.escalated) {
      // Send escalation SMS
      const smsResult = await sendSMS(recipient.phone, composeSMSBody(alert, true));

      const escalationRecord = upsertActiveNotification(signature, alert, 'escalated');

      // Mark as escalated so we don't repeat
      const db = getDb();
      dbRun('UPDATE active_notifications SET escalated = 1 WHERE signature = ?', signature);

      console.log(`[DEDUP] ESCALATED: ${signature} (active ${Math.round(activeDuration / 60000)}min)`);

      return {
        action: 'escalated',
        signature,
        duration: Math.round(activeDuration / 60000),
        smsSent: smsResult?.sent || false,
        notification: escalationRecord,
      };
    }

    // Condition still active — suppress SMS, just update tracking
    const updated = upsertActiveNotification(signature, alert, 'active');
    console.log(`[DEDUP] SUPPRESSED: ${signature} (occurrence #${updated?.occurrence_count || '?'}, active ${Math.round(activeDuration / 60000)}min)`);

    return {
      action: 'suppressed',
      signature,
      occurrenceCount: updated?.occurrence_count || 1,
      notificationCount: updated?.notification_count || 0,
      duration: Math.round(activeDuration / 60000),
    };
  }

  // --- NEW SIGNATURE — SEND SMS ---
  const smsResult = await sendSMS(recipient.phone, composeSMSBody(alert));

  const notificationRecord = upsertActiveNotification(signature, alert, 'notified');

  // Cache it
  activeCache.set(signature, { ...notificationRecord, status: 'active' });

  // Emit to frontend for live dispatch log
  const io = getIo();
  if (io) {
    io.emit('notification:new', {
      id: notificationRecord.id,
      alert_id: alert.id,
      station_id: alert.stationId,
      category: alert.category,
      authority: recipient.label,
      contact: recipient.phone.replace(/(\+\d{2})\d{8}/, '$1XXXXXXXX'),
      channel: 'sms',
      subject: `[P${alert.priority[1]}] ${alert.title}`,
      body: composeSMSBody(alert),
      status: smsResult?.sent ? 'delivered' : 'sent',
      delivery_detail: smsResult?.sent
        ? `SMS delivered via Twilio (SID: ${smsResult.sid})`
        : 'SMS queued (simulated dispatch)',
      timestamp: nowISO,
      occurrence_count: 1,
      notification_count: 1,
      suppression_note: 'Initial dispatch',
    });
  }

  console.log(`[DEDUP] NEW: ${signature} → SMS sent to ${recipient.label}`);

  return {
    action: 'sent',
    signature,
    smsSent: smsResult?.sent || false,
    notification: notificationRecord,
  };
}

// ============================================================
// ADMIN: GET ACTIVE ISSUES
// ============================================================

export function getActiveNotifications() {
  return getAllActive();
}

export function getActiveSignatures() {
  return getAllActive().map(e => e.signature);
}

export function isSignatureActive(signature) {
  // Check cache first
  if (activeCache.has(signature)) return activeCache.get(signature);
  // Check DB
  const entry = getActiveEntry(signature);
  if (entry) {
    activeCache.set(signature, entry);
    return entry;
  }
  return null;
}

// ============================================================
// INIT: LOAD ACTIVE ENTRIES ON STARTUP
// ============================================================

export function loadActiveNotifications() {
  const active = getAllActive();
  active.forEach(entry => {
    activeCache.set(entry.signature, entry);
  });
  console.log(`[DEDUP] Loaded ${active.length} active notification entries`);
}
