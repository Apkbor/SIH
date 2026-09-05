/**
 * Database initialization and access layer
 * Uses sql.js (pure JS SQLite — no native compilation needed)
 */

import initSqlJs from 'sql.js';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'platform.db');

import { mkdirSync } from 'fs';
mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true });

let db = null;
let SQL = null;

export async function initDatabase() {
  if (db) return db;

  SQL = await initSqlJs();

  if (existsSync(DB_PATH)) {
    db = new SQL.Database(readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  const schemaSQL = readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  db.run(schemaSQL);

  // Check if stations exist
  const check = dbExec('SELECT COUNT(*) as c FROM stations');
  if (check.length === 0 || check[0].c === 0) {
    seedStations();
    seedBuildings();
    seedInventory();
    console.log('[DB] Seeded stations, buildings, and inventory');
  }

  saveDatabase();
  return db;
}

export function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export function saveDatabase() {
  if (db) {
    const data = db.export();
    writeFileSync(DB_PATH, Buffer.from(data));
  }
}

// ---- Query wrappers ----

/**
 * dbAll: Run a SELECT query, return array of objects.
 * Usage: dbAll("SELECT * FROM stations WHERE id = ?", 'BHARATI')
 */
export function dbAll(sql, ...params) {
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

/**
 * dbOne: Run a SELECT, return first row as object or null.
 * Usage: dbOne("SELECT * FROM stations WHERE id = ?", 'BHARATI')
 */
export function dbOne(sql, ...params) {
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

/**
 * dbRun: Run INSERT/UPDATE/DELETE.
 * Usage: dbRun("INSERT INTO alerts (id, title) VALUES (?, ?)", 'A-1', 'Title')
 * Returns: { changes: number_of_rows_affected }
 */
export function dbRun(sql, ...params) {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params.length > 0 ? params : []);
    stmt.step();
    return { changes: db.getRowsModified() };
  } finally {
    stmt.free();
  }
}

// ---- Internal ----

function dbExec(sql) {
  const stmt = db.prepare(sql);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// ---- Seeding ----

function seedStations() {
  dbRun("INSERT INTO stations (id, name, location, latitude, longitude) VALUES (?, ?, ?, ?, ?)",
    'BHARATI', 'Bharati', "Dakshin Gangotri, Antarctica", -69.0, 76.1);
  dbRun("INSERT INTO stations (id, name, location, latitude, longitude) VALUES (?, ?, ?, ?, ?)",
    'MAITRI', 'Maitri', "Schirmacher Oasis, Antarctica", -70.76, 11.73);
}

function seedBuildings() {
  const buildings = [
    ['BHA-LAB1', 'BHARATI', 'Science Laboratory', 'lab', 1],
    ['BHA-LAB2', 'BHARATI', 'Research Laboratory', 'lab', 1],
    ['BHA-LIVING', 'BHARATI', 'Living Quarters', 'residential', 0],
    ['BHA-GEN', 'BHARATI', 'Generator Building', 'power', 1],
    ['BHA-COM', 'BHARATI', 'Communication Center', 'comms', 1],
    ['BHA-STORE', 'BHARATI', 'Storage Warehouse', 'storage', 0],
    ['MAI-LAB1', 'MAITRI', 'Meteorology Lab', 'lab', 1],
    ['MAI-LIVING', 'MAITRI', 'Accommodation Block', 'residential', 0],
    ['MAI-GEN', 'MAITRI', 'Power House', 'power', 1],
    ['MAI-COM', 'MAITRI', 'Satellite Comms', 'comms', 1],
    ['MAI-STORAGE', 'MAITRI', 'Supply Depot', 'storage', 0],
    ['MAI-MED', 'MAITRI', 'Medical Bay', 'medical', 1],
  ];

  const stmt = db.prepare('INSERT INTO buildings (id, station_id, name, type, critical) VALUES (?, ?, ?, ?, ?)');
  for (const b of buildings) {
    stmt.bind(b);
    stmt.step();
  }
  stmt.free();
}

function seedInventory() {
  const items = [
    ['BHARATI', 'fuel', 'Diesel Fuel', 45000, 'litres', 150],
    ['BHARATI', 'food', 'Dry Rations', 8000, 'kg', 25],
    ['BHARATI', 'food', 'Fresh Produce Reserve', 500, 'kg', 18],
    ['BHARATI', 'medicine', 'General Medicines', 2000, 'units', 5],
    ['BHARATI', 'medicine', 'Antibiotics', 500, 'units', 2],
    ['BHARATI', 'power', 'Generator Spare Parts', 30, 'units', 0.5],
    ['MAITRI', 'fuel', 'Diesel Fuel', 55000, 'litres', 120],
    ['MAITRI', 'food', 'Dry Rations', 12000, 'kg', 30],
    ['MAITRI', 'food', 'Fresh Produce Reserve', 800, 'kg', 22],
    ['MAITRI', 'medicine', 'General Medicines', 3000, 'units', 6],
    ['MAITRI', 'medicine', 'Antibiotics', 700, 'units', 2.5],
    ['MAITRI', 'power', 'Generator Spare Parts', 40, 'units', 0.4],
  ];

  let idx = 0;
  for (const item of items) {
    const daysRemaining = item[5] > 0 ? Math.round(item[3] / item[5]) : 9999;
    dbRun(
      'INSERT INTO inventory (id, station_id, category, item, current_qty, unit, daily_rate, days_remaining) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      `INV-${++idx}`, item[0], item[1], item[2], item[3], item[4], item[5], daysRemaining
    );
  }
}
