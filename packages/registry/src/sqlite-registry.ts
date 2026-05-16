/**
 * Nexarion — SQLite-Backed Agent Registry
 *
 * Persistent agent directory with SQLite storage.
 * Survives server restarts, supports search and health tracking.
 *
 * Requires: better-sqlite3 or sql.js
 */

import type { AgentCard } from 'nexarion-core';
import type { RegistryEntry } from './index.js';

export interface SQLiteDB {
  exec(sql: string): void;
  prepare(sql: string): SQLiteStatement;
  close(): void;
}

export interface SQLiteStatement {
  run(...params: unknown[]): { changes: number };
  get(...params: unknown[]): Record<string, unknown> | undefined;
  all(...params: unknown[]): Record<string, unknown>[];
}

export class SQLiteAgentRegistry {
  private db: SQLiteDB;

  constructor(db: SQLiteDB) {
    this.db = db;
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        url TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        version TEXT,
        verified INTEGER DEFAULT 0,
        registered_at TEXT,
        last_seen TEXT,
        health_status TEXT DEFAULT 'unknown',
        category TEXT,
        tags TEXT,
        card_json TEXT
      )
    `);
  }

  register(entry: RegistryEntry): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO agents (url, name, description, version, verified, registered_at, last_seen, health_status, category, tags, card_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.card.url, entry.card.name, entry.card.description, entry.card.version,
      entry.verified ? 1 : 0, entry.registeredAt, entry.lastSeen,
      entry.healthStatus, entry.category, entry.tags.join(','),
      JSON.stringify(entry.card),
    );
  }

  unregister(url: string): void {
    this.db.prepare('DELETE FROM agents WHERE url = ?').run(url);
  }

  search(query: string): RegistryEntry[] {
    const rows = this.db.prepare(
      `SELECT * FROM agents WHERE name LIKE ? OR description LIKE ? OR category LIKE ? OR tags LIKE ?`
    ).all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`) as Record<string, unknown>[];
    return rows.map(this.rowToEntry);
  }

  list(): RegistryEntry[] {
    const rows = this.db.prepare('SELECT * FROM agents ORDER BY name').all() as Record<string, unknown>[];
    return rows.map(this.rowToEntry);
  }

  get(url: string): RegistryEntry | undefined {
    const row = this.db.prepare('SELECT * FROM agents WHERE url = ?').get(url) as Record<string, unknown> | undefined;
    return row ? this.rowToEntry(row) : undefined;
  }

  get healthy(): RegistryEntry[] {
    const rows = this.db.prepare('SELECT * FROM agents WHERE health_status = ?').all('healthy') as Record<string, unknown>[];
    return rows.map(this.rowToEntry);
  }

  async healthCheck(): Promise<void> {
    const rows = this.db.prepare('SELECT url FROM agents').all() as Record<string, unknown>[];
    for (const { url } of rows) {
      try {
        const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) });
        this.db.prepare('UPDATE agents SET last_seen = ?, health_status = ? WHERE url = ?')
          .run(new Date().toISOString(), res.ok ? 'healthy' : 'degraded', url);
      } catch {
        this.db.prepare('UPDATE agents SET last_seen = ?, health_status = ? WHERE url = ?')
          .run(new Date().toISOString(), 'down', url);
      }
    }
  }

  count(): number {
    const row = this.db.prepare('SELECT COUNT(*) as c FROM agents').get() as Record<string, unknown>;
    return (row?.c as number) || 0;
  }

  private rowToEntry(row: Record<string, unknown>): RegistryEntry {
    return {
      card: row.card_json ? JSON.parse(row.card_json as string) : {
        name: row.name as string, description: (row.description as string) || '',
        url: row.url as string, version: (row.version as string) || '1.0',
        capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
        skills: [], endpoints: {},
      },
      verified: row.verified === 1,
      registeredAt: row.registered_at as string,
      lastSeen: row.last_seen as string,
      healthStatus: (row.health_status as RegistryEntry['healthStatus']) || 'unknown',
      category: (row.category as string) || '',
      tags: (row.tags as string)?.split(',').filter(Boolean) || [],
    };
  }

  close(): void { this.db.close(); }
}
