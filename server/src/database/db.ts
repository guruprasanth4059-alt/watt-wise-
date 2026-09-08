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

// Initialize schema
export function initializeDatabase() {
  let schemaPath = path.join(__dirname, 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    schemaPath = path.resolve(__dirname, '../../src/database/schema.sql');
  }
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  }
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
