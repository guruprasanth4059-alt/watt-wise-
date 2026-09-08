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
