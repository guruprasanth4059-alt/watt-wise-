import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'wattwise.db');
export const db = new DatabaseSync(DB_PATH);

// Enable foreign keys and WAL mode for high performance & reliability
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

// Initialize schema and safe migrations
export function initializeDatabase() {
  let schemaPath = path.join(__dirname, 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    schemaPath = path.resolve(__dirname, '../../src/database/schema.sql');
  }
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  }

  // Safe migration additions for SQLite tables
  const safeAddColumn = (table: string, columnDef: string) => {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDef};`);
    } catch {
      // Column already exists
    }
  };

  // Societies
  safeAddColumn('societies', 'occupancy_estimate INTEGER DEFAULT 85');
  safeAddColumn('societies', 'pilot_start_date TEXT');
  safeAddColumn('societies', 'pilot_end_date TEXT');
  safeAddColumn('societies', 'pilot_status TEXT DEFAULT "active_pilot"');
  safeAddColumn('societies', 'is_demo INTEGER DEFAULT 0');
  safeAddColumn('societies', 'timezone TEXT DEFAULT "Asia/Kolkata"');

  // Meters
  safeAddColumn('meters', 'parent_meter_id TEXT');
  safeAddColumn('meters', 'is_main_meter INTEGER DEFAULT 0');
  safeAddColumn('meters', 'category TEXT DEFAULT "common_area"');
  safeAddColumn('meters', 'timezone TEXT DEFAULT "Asia/Kolkata"');
  safeAddColumn('meters', 'data_source TEXT DEFAULT "manual"');
  safeAddColumn('meters', 'connection_status TEXT DEFAULT "not_connected"');

  // Bills
  safeAddColumn('bills', 'previous_reading REAL');
  safeAddColumn('bills', 'current_reading REAL');
  safeAddColumn('bills', 'billing_days INTEGER');
  safeAddColumn('bills', 'extraction_confidence TEXT DEFAULT "high"');
  safeAddColumn('bills', 'verification_status TEXT DEFAULT "verified"');
  safeAddColumn('bills', 'verified_date TEXT');

  // Recommendations
  safeAddColumn('recommendations', 'problem_observed TEXT');
  safeAddColumn('recommendations', 'evidence TEXT');
  safeAddColumn('recommendations', 'suggested_investigation TEXT');
  safeAddColumn('recommendations', 'potential_impact TEXT');
  safeAddColumn('recommendations', 'confidence TEXT DEFAULT "medium"');
  safeAddColumn('recommendations', 'assigned_to TEXT');
  safeAddColumn('recommendations', 'due_date TEXT');

  // Actions
  safeAddColumn('actions', 'person_responsible TEXT');
  safeAddColumn('actions', 'previous_condition TEXT');
  safeAddColumn('actions', 'new_condition TEXT');
  safeAddColumn('actions', 'measurement_period TEXT');
  safeAddColumn('actions', 'baseline_reference_kwh REAL');
  safeAddColumn('actions', 'post_action_average_kwh REAL');
  safeAddColumn('actions', 'observed_reduction_kwh REAL');
  safeAddColumn('actions', 'observed_reduction_percent REAL');
  safeAddColumn('actions', 'savings_confidence TEXT DEFAULT "medium"');
  safeAddColumn('actions', 'methodology TEXT');

  // AI Insights
  safeAddColumn('ai_insights', 'recommended_checks TEXT DEFAULT "[]"');
  safeAddColumn('ai_insights', 'data_limitations TEXT DEFAULT "[]"');

  // Phase 3 Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS meter_connections (
        id TEXT PRIMARY KEY,
        society_id TEXT NOT NULL,
        meter_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'not_connected',
        external_meter_id TEXT,
        data_source TEXT DEFAULT 'smart_meter',
        config TEXT DEFAULT '{}',
        last_sync_at TEXT,
        last_success_at TEXT,
        last_error_at TEXT,
        last_error_message TEXT,
        records_received INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meter_measurements (
        id TEXT PRIMARY KEY,
        society_id TEXT NOT NULL,
        meter_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        energy_kwh REAL NOT NULL,
        demand_kw REAL,
        voltage REAL,
        current REAL,
        power_factor REAL,
        frequency REAL,
        source TEXT NOT NULL DEFAULT 'smart_meter',
        quality_status TEXT NOT NULL DEFAULT 'valid',
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(meter_id, timestamp, source)
    );

    CREATE TABLE IF NOT EXISTS anomalies (
        id TEXT PRIMARY KEY,
        society_id TEXT NOT NULL,
        meter_id TEXT,
        type TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'medium',
        observed_value REAL NOT NULL,
        expected_value REAL NOT NULL,
        deviation_percent REAL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        status TEXT DEFAULT 'new',
        explanation TEXT,
        recommended_checks TEXT DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS investigations (
        id TEXT PRIMARY KEY,
        society_id TEXT NOT NULL,
        anomaly_id TEXT NOT NULL,
        possible_cause TEXT,
        notes TEXT,
        action_taken TEXT,
        resolution TEXT,
        resolved_at TEXT,
        created_by TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tariffs (
        id TEXT PRIMARY KEY,
        society_id TEXT NOT NULL,
        name TEXT NOT NULL,
        rate_type TEXT NOT NULL DEFAULT 'fixed',
        rate_per_kwh REAL DEFAULT 8.0,
        configuration TEXT DEFAULT '{}',
        effective_from TEXT,
        effective_to TEXT,
        source TEXT DEFAULT 'user_entered',
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_meter_connections_society ON meter_connections(society_id);
    CREATE INDEX IF NOT EXISTS idx_meter_connections_meter ON meter_connections(meter_id);
    CREATE INDEX IF NOT EXISTS idx_measurements_meter_time ON meter_measurements(meter_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_measurements_society_time ON meter_measurements(society_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_anomalies_society ON anomalies(society_id);
    CREATE INDEX IF NOT EXISTS idx_anomalies_meter ON anomalies(meter_id);
    CREATE INDEX IF NOT EXISTS idx_anomalies_status ON anomalies(status);
    CREATE INDEX IF NOT EXISTS idx_investigations_anomaly ON investigations(anomaly_id);
    CREATE INDEX IF NOT EXISTS idx_tariffs_society ON tariffs(society_id);
  `);
}

// Database helper functions with typed outputs
export function query<T = any>(sql: string, params: any[] = []): T[] {
  const stmt = db.prepare(sql);
  return stmt.all(...params) as T[];
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const stmt = db.prepare(sql);
  const result = stmt.get(...params);
  return (result ?? null) as T | null;
}

export function execute(sql: string, params: any[] = []): { changes: number | bigint; lastInsertRowid: number | bigint } {
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

export function transaction<T>(fn: () => T): T {
  db.exec('BEGIN TRANSACTION;');
  try {
    const result = fn();
    db.exec('COMMIT;');
    return result;
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}
