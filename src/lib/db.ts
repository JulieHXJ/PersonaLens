import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";
import { WebsiteAnalysis, Persona } from "./types";
import { createLogger } from "./logger";

const log = createLogger("db");

const DB_DIR = process.env.DB_DIR || "./data";
const DB_PATH = path.join(DB_DIR, "nightshift.db");
const SCREENSHOTS_DIR = path.join(DB_DIR, "screenshots");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    migrate(_db);
    log.info(`Database initialized at ${DB_PATH}`);
  }
  return _db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS explorations (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      product_name TEXT,
      analysis_json TEXT,
      personas_json TEXT,
      events_json TEXT,
      event_count INTEGER DEFAULT 0,
      screenshot_count INTEGER DEFAULT 0,
      error_message TEXT,
      duration_ms INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS screenshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exploration_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      label TEXT,
      order_idx INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (exploration_id) REFERENCES explorations(id)
    );

    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      exploration_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      config_json TEXT NOT NULL,
      results_json TEXT,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (exploration_id) REFERENCES explorations(id)
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      component TEXT NOT NULL,
      message TEXT NOT NULL,
      data_json TEXT,
      duration_ms INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_explorations_created ON explorations(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_screenshots_exploration ON screenshots(exploration_id);
    CREATE INDEX IF NOT EXISTS idx_runs_exploration ON runs(exploration_id);
    CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_logs_component ON logs(component);
  `);

  // Add columns if missing (for existing DBs)
  try { db.exec("ALTER TABLE explorations ADD COLUMN events_json TEXT"); } catch { /* already exists */ }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// --- Screenshots ---

export function saveScreenshot(explorationId: string, base64: string, label: string, orderIdx: number): string {
  const filename = `${explorationId}_${orderIdx}.jpg`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  try {
    fs.writeFileSync(filepath, Buffer.from(base64, "base64"));
    getDb().prepare(
      "INSERT INTO screenshots (exploration_id, filename, label, order_idx) VALUES (?, ?, ?, ?)"
    ).run(explorationId, filename, label, orderIdx);
  } catch (err) {
    log.warn(`Failed to save screenshot: ${err instanceof Error ? err.message : err}`);
  }
  return filename;
}

export function getScreenshots(explorationId: string): { filename: string; label: string; order_idx: number }[] {
  return getDb().prepare(
    "SELECT filename, label, order_idx FROM screenshots WHERE exploration_id = ? ORDER BY order_idx"
  ).all(explorationId) as { filename: string; label: string; order_idx: number }[];
}

export function getScreenshotPath(filename: string): string {
  return path.join(SCREENSHOTS_DIR, filename);
}

// --- Explorations ---

export function createExploration(url: string): string {
  const id = generateId();
  getDb().prepare(
    "INSERT INTO explorations (id, url) VALUES (?, ?)"
  ).run(id, url);
  log.info(`Exploration created: ${id}`, { url });
  return id;
}

export function updateExplorationProgress(id: string, eventCount: number, screenshotCount: number) {
  getDb().prepare(
    "UPDATE explorations SET event_count = ?, screenshot_count = ? WHERE id = ?"
  ).run(eventCount, screenshotCount, id);
}

export function saveExplorationEvents(id: string, events: unknown[]) {
  const stripped = events.map((e: Record<string, unknown>) => {
    const { screenshot, ...rest } = e as Record<string, unknown>;
    void screenshot;
    return rest;
  });
  getDb().prepare(
    "UPDATE explorations SET events_json = ? WHERE id = ?"
  ).run(JSON.stringify(stripped), id);
}

export function completeExploration(
  id: string,
  analysis: WebsiteAnalysis,
  personas: Persona[],
  durationMs: number
) {
  getDb().prepare(`
    UPDATE explorations 
    SET status = 'completed', product_name = ?, analysis_json = ?, personas_json = ?,
        duration_ms = ?, completed_at = datetime('now')
    WHERE id = ?
  `).run(
    analysis.productName,
    JSON.stringify(analysis),
    JSON.stringify(personas),
    durationMs,
    id
  );
  log.info(`Exploration completed: ${id}`, { productName: analysis.productName, personas: personas.length, durationMs });
}

export function failExploration(id: string, error: string, durationMs: number) {
  getDb().prepare(`
    UPDATE explorations 
    SET status = 'failed', error_message = ?, duration_ms = ?, completed_at = datetime('now')
    WHERE id = ?
  `).run(error, durationMs, id);
  log.warn(`Exploration failed: ${id}`, { error, durationMs });
}

export interface ExplorationRow {
  id: string;
  url: string;
  status: string;
  product_name: string | null;
  analysis_json: string | null;
  personas_json: string | null;
  events_json: string | null;
  event_count: number;
  screenshot_count: number;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
  completed_at: string | null;
}

export function getExploration(id: string): ExplorationRow | undefined {
  return getDb().prepare("SELECT * FROM explorations WHERE id = ?").get(id) as ExplorationRow | undefined;
}

export function listExplorations(limit = 20, offset = 0): ExplorationRow[] {
  return getDb().prepare(
    "SELECT * FROM explorations ORDER BY created_at DESC LIMIT ? OFFSET ?"
  ).all(limit, offset) as ExplorationRow[];
}

export function countExplorations(): number {
  const row = getDb().prepare("SELECT COUNT(*) as count FROM explorations").get() as { count: number };
  return row.count;
}

// --- Runs ---

export function createRun(explorationId: string, config: unknown): string {
  const id = generateId();
  getDb().prepare(
    "INSERT INTO runs (id, exploration_id, config_json) VALUES (?, ?, ?)"
  ).run(id, explorationId, JSON.stringify(config));
  return id;
}

export function completeRun(id: string, results: unknown) {
  getDb().prepare(`
    UPDATE runs SET status = 'completed', results_json = ?, completed_at = datetime('now') WHERE id = ?
  `).run(JSON.stringify(results), id);
}

export function failRun(id: string) {
  getDb().prepare(
    "UPDATE runs SET status = 'failed', completed_at = datetime('now') WHERE id = ?"
  ).run(id);
}

export interface RunRow {
  id: string;
  exploration_id: string;
  status: string;
  config_json: string;
  results_json: string | null;
  started_at: string;
  completed_at: string | null;
}

export function getRun(id: string): RunRow | undefined {
  return getDb().prepare("SELECT * FROM runs WHERE id = ?").get(id) as RunRow | undefined;
}

export function getRunsByExploration(explorationId: string): RunRow[] {
  return getDb().prepare(
    "SELECT * FROM runs WHERE exploration_id = ? ORDER BY started_at DESC"
  ).all(explorationId) as RunRow[];
}

export function listRuns(limit = 20, offset = 0): RunRow[] {
  return getDb().prepare(
    "SELECT r.*, e.url, e.product_name FROM runs r JOIN explorations e ON r.exploration_id = e.id ORDER BY r.started_at DESC LIMIT ? OFFSET ?"
  ).all(limit, offset) as RunRow[];
}

// --- Structured Logs ---

export function insertLog(level: string, component: string, message: string, data?: unknown, durationMs?: number) {
  try {
    getDb().prepare(
      "INSERT INTO logs (level, component, message, data_json, duration_ms) VALUES (?, ?, ?, ?, ?)"
    ).run(level, component, message, data ? JSON.stringify(data) : null, durationMs ?? null);
  } catch {
    // Don't let log writes crash the app
  }
}

export function queryLogs(opts: {
  component?: string;
  level?: string;
  limit?: number;
  offset?: number;
  since?: string;
}) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts.component) {
    conditions.push("component = ?");
    params.push(opts.component);
  }
  if (opts.level) {
    conditions.push("level = ?");
    params.push(opts.level);
  }
  if (opts.since) {
    conditions.push("created_at >= ?");
    params.push(opts.since);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  params.push(opts.limit ?? 100, opts.offset ?? 0);

  return getDb().prepare(
    `SELECT * FROM logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params);
}
