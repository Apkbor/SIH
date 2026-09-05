/**
 * Notification Dispatcher
 *
 * Called automatically when a P0 alert fires.
 * Looks up the responsible authority, records the dispatch, and (if configured)
 * sends a real email via Nodemailer.
 *
 * The "dispatch log" concept: every notification is persisted to the DB
 * so the UI can show a live feed of dispatches with delivery status.
 */

import { getDb, dbRun } from '../db/index.js';
import { resolveAuthority } from '../config/authorities.js';
import { getIoServer } from '../simulator/engine.js';

/**
 * Compose a human-readable notification message from an alert object.
 */
export function composeNotificationMessage(alert) {
  const stationNames = { BHARATI: 'Bharati Station', MAITRI: 'Maitri Station' };
  const stationName = stationNames[alert.stationId] || alert.stationId;

  const subject = `[P0 CRITICAL] ${alert.title} — ${stationName}`;

  const body = `CRITICAL ALERT — IMMEDIATE ACTION REQUIRED

Station:    ${stationName} (${alert.stationId})
Category:   ${alert.category.toUpperCase()}
Priority:   ${alert.priority}
Time:       ${new Date(alert.timestamp || Date.now()).toISOString().replace('T', ' ').slice(0, 19)} UTC

${alert.title}

${alert.description || ''}

Current Value: ${alert.value ?? 'N/A'}
Threshold:     ${alert.threshold ?? 'N/A'}

---
Automated dispatch by Antarctic Digital Twin Platform (SIH 2026)
Ref: ${alert.id}`;

  return { subject, body };
}

/**
 * Record a notification dispatch in the database and emit it via Socket.io.
 * This is the single call sites use — email sending is attempted here,
 * and the dispatch log entry is always written regardless of email success.
 */
export async function dispatchNotification(alert) {
  const authority = resolveAuthority(alert.category, alert.title);
  const { subject, body } = composeNotificationMessage(alert);

  const notificationId = `N-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Determine simulated delivery status (instant for demo; real email would async resolve)
  let status = 'sent';
  let deliveryDetail = 'Dispatched via simulated dispatch service';

  // Attempt real email if nodemailer is configured
  let emailSent = false;
  try {
    // Dynamic import so the app works without nodemailer installed
    const { sendAlertEmail } = await import('./email.js');
    emailSent = await sendAlertEmail(authority.contact, subject, body);
    if (emailSent) {
      status = 'delivered';
      deliveryDetail = `Email delivered to ${authority.contact}`;
    } else {
      status = 'sent';
      deliveryDetail = 'Queued (no email transport configured)';
    }
  } catch (err) {
    console.log('[NOTIFY] Email transport unavailable, using simulated dispatch:', err.message);
    status = 'sent';
    deliveryDetail = `Simulated dispatch to ${authority.authority} (${authority.channel})`;
  }

  const record = {
    id: notificationId,
    alert_id: alert.id,
    station_id: alert.stationId,
    category: alert.category,
    authority: authority.authority,
    contact: authority.contact,
    channel: authority.channel,
    subject,
    body,
    status,
    delivery_detail: deliveryDetail,
    timestamp: new Date().toISOString(),
  };

  // Persist to DB
  try {
    dbRun(
      'INSERT INTO notifications (id, alert_id, station_id, category, authority, contact, channel, subject, body, status, delivery_detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      record.id, record.alert_id, record.station_id, record.category,
      record.authority, record.contact, record.channel, record.subject,
      record.body, record.status, record.delivery_detail
    );
  } catch (err) {
    console.error('[NOTIFY] Failed to persist dispatch:', err);
  }

  // Emit live to frontend
  const io = getIoServer();
  if (io) {
    io.emit('notification:new', record);
    io.to(`alerts:${alert.stationId}`).emit('notification:new', record);
  }

  console.log(`[NOTIFY] ${status.toUpperCase()}: ${subject} → ${authority.authority} (${authority.contact})`);

  return record;
}

/**
 * Get recent notifications from DB.
 */
export function getRecentNotifications(limit = 50) {
  try {
    const db = getDb();
    const rows = dbAllFromDb(
      db,
      'SELECT * FROM notifications ORDER BY timestamp DESC LIMIT ?',
      limit
    );
    return rows;
  } catch (err) {
    console.error('[NOTIFY] Failed to fetch notifications:', err);
    return [];
  }
}

// SQL.js compatible query helpers
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
