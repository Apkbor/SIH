-- ============================================================
-- Database Schema for AI-Powered Digital Twin Platform
-- SIH 2026 — Indian Antarctic Research Stations
-- ============================================================

-- Stations reference
CREATE TABLE IF NOT EXISTS stations (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  location    TEXT,
  buildings   INTEGER DEFAULT 0,
  latitude    REAL,
  longitude   REAL,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Buildings within each station
CREATE TABLE IF NOT EXISTS buildings (
  id          TEXT PRIMARY KEY,
  station_id  TEXT NOT NULL,
  name        TEXT NOT NULL,
  type        TEXT,
  critical    INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (station_id) REFERENCES stations(id)
);

-- Inventory items per station
CREATE TABLE IF NOT EXISTS inventory (
  id          TEXT PRIMARY KEY,
  station_id  TEXT NOT NULL,
  category    TEXT NOT NULL,
  item        TEXT NOT NULL,
  current_qty REAL DEFAULT 0,
  unit        TEXT DEFAULT 'units',
  daily_rate  REAL DEFAULT 0,
  days_remaining REAL DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (station_id) REFERENCES stations(id)
);

-- Time-series sensor readings
CREATE TABLE IF NOT EXISTS readings (
  id          TEXT PRIMARY KEY,
  station_id  TEXT NOT NULL,
  building_id TEXT,
  type        TEXT NOT NULL,
  data        TEXT NOT NULL,
  timestamp   TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (station_id) REFERENCES stations(id),
  FOREIGN KEY (building_id) REFERENCES buildings(id)
);

-- Alerts / events
CREATE TABLE IF NOT EXISTS alerts (
  id              TEXT PRIMARY KEY,
  station_id      TEXT NOT NULL,
  priority        TEXT NOT NULL,
  category        TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  value           TEXT,
  threshold       TEXT,
  acknowledged    INTEGER DEFAULT 0,
  resolved        INTEGER DEFAULT 0,
  timestamp       TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (station_id) REFERENCES stations(id)
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_readings_station_type_ts ON readings(station_id, type, timestamp);
CREATE INDEX IF NOT EXISTS idx_alerts_station_priority ON alerts(station_id, priority, timestamp);
CREATE INDEX IF NOT EXISTS idx_alerts_unresolved ON alerts(station_id, resolved, timestamp);

-- Notification dispatch log (Feature 1)
CREATE TABLE IF NOT EXISTS notifications (
  id              TEXT PRIMARY KEY,
  alert_id        TEXT NOT NULL,
  station_id      TEXT NOT NULL,
  category        TEXT NOT NULL,
  authority       TEXT NOT NULL,
  contact         TEXT NOT NULL,
  channel         TEXT DEFAULT 'email',
  subject         TEXT,
  body            TEXT,
  status          TEXT DEFAULT 'pending',
  -- pending | sent | delivered | failed
  delivery_detail TEXT,
  timestamp       TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_alert ON notifications(alert_id);
CREATE INDEX IF NOT EXISTS idx_notifications_station ON notifications(station_id, timestamp);

-- Chat messages (Feature 2)
CREATE TABLE IF NOT EXISTS messages (
  id          TEXT PRIMARY KEY,
  channel     TEXT NOT NULL,
  sender      TEXT NOT NULL,
  content     TEXT NOT NULL,
  msg_type    TEXT DEFAULT 'user',
  -- user | system | bot
  station_id  TEXT,
  timestamp   TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_channel_ts ON messages(channel, timestamp);

-- Active notification tracking (Feature 1: dedup + escalation)
-- Tracks which alert signatures are currently active to prevent duplicate SMS
CREATE TABLE IF NOT EXISTS active_notifications (
  id                TEXT PRIMARY KEY,
  signature         TEXT NOT NULL UNIQUE,
  -- e.g. "BHARATI:fuel:P0"
  station_id        TEXT NOT NULL,
  category          TEXT NOT NULL,
  priority          TEXT NOT NULL,
  alert_id          TEXT NOT NULL,
  status            TEXT DEFAULT 'active',
  -- active | resolved | escalated
  first_seen        TEXT DEFAULT (datetime('now')),
  last_seen         TEXT DEFAULT (datetime('now')),
  occurrence_count  INTEGER DEFAULT 1,
  -- how many times this alert has fired while active
  notification_count INTEGER DEFAULT 0,
  -- how many SMS actually sent
  last_sms_sent_at  TEXT,
  resolved_at       TEXT,
  escalated         INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_active_sig ON active_notifications(signature);
CREATE INDEX IF NOT EXISTS idx_active_status ON active_notifications(status);
