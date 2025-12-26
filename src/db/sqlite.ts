import Database from "better-sqlite3";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";

// Explicitly type the database to satisfy TypeScript
export const db: BetterSqliteDatabase = new Database("db/memory.db");


// ----------------------------
// Vendor memory table
// ----------------------------
db.prepare(`
  CREATE TABLE IF NOT EXISTS vendor_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor TEXT,
    field TEXT,
    reason TEXT,
    confidence REAL,
    learnedAt TEXT
  )
`).run();

// ----------------------------
// Processed invoices table (FOR DUPLICATES)
// ----------------------------
db.prepare(`
  CREATE TABLE IF NOT EXISTS processed_invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor TEXT,
    invoiceNumber TEXT,
    invoiceDate TEXT
  )
`).run();
