import { config } from '../../core/index.ts';
import type { Framework, LeaderboardEntry, LeaderboardLists, LeaderboardResponse } from '../../core/index.ts';
import type { SqlPort } from './ports.ts';

const Frameworks: readonly Framework[] = ['scrum', 'kanban'];
const DatePattern = /^\d{4}-\d{2}-\d{2}$/;
const TeamNameMax = 40;

interface Row {
  seq: number;
  entry: LeaderboardEntry;
}

function isCount(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max;
}

/**
 * Validates an entry that came from a room; anything unexpected is refused.
 */
export function parseEntry(raw: unknown): LeaderboardEntry | null {
  if (raw === null || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const { framework, teamName, players, score, escapedDefects, averageCycleMs, date } = value;
  if (!Frameworks.includes(framework as Framework)) return null;
  if (typeof teamName !== 'string' || teamName.length === 0 || teamName.length > TeamNameMax) return null;
  if (!isCount(players, config.players.max) || players < 1) return null;
  if (!isCount(score, 1_000_000) || !isCount(escapedDefects, 1000)) return null;
  const cycleValid = averageCycleMs === null || (typeof averageCycleMs === 'number' && Number.isFinite(averageCycleMs) && averageCycleMs >= 0);
  if (!cycleValid) return null;
  if (typeof date !== 'string' || !DatePattern.test(date)) return null;
  return {
    framework: framework as Framework,
    teamName,
    players,
    score,
    escapedDefects,
    averageCycleMs: averageCycleMs as number | null,
    date,
  };
}

function orderBy(framework: Framework): string {
  const cycle = framework === 'kanban' ? 'CASE WHEN cycle_ms IS NULL THEN 1 ELSE 0 END ASC, cycle_ms ASC, ' : '';
  return `ORDER BY score DESC, escaped ASC, ${cycle}date ASC, seq ASC`;
}

function toRow(raw: Record<string, unknown>): Row {
  return {
    seq: Number(raw.seq),
    entry: {
      framework: raw.framework as Framework,
      teamName: String(raw.team_name),
      players: Number(raw.players),
      score: Number(raw.score),
      escapedDefects: Number(raw.escaped),
      averageCycleMs: raw.cycle_ms === null || raw.cycle_ms === undefined ? null : Number(raw.cycle_ms),
      date: String(raw.date),
    },
  };
}

/**
 * Stores published results and answers the monthly and all-time top lists.
 */
export class LeaderboardStore {
  private readonly sql: SqlPort;
  private readonly now: () => number;

  constructor(sql: SqlPort, now: () => number) {
    this.sql = sql;
    this.now = now;
    sql.exec(
      `CREATE TABLE IF NOT EXISTS entries (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        room TEXT NOT NULL UNIQUE,
        framework TEXT NOT NULL,
        team_name TEXT NOT NULL,
        players INTEGER NOT NULL,
        score INTEGER NOT NULL,
        escaped INTEGER NOT NULL,
        cycle_ms REAL,
        date TEXT NOT NULL,
        month TEXT NOT NULL
      )`,
    );
  }

  /**
   * Adds an entry once per room; answers false for a repeat or an invalid entry.
   */
  submit(roomId: string, raw: unknown): boolean {
    const entry = parseEntry(raw);
    if (entry === null || typeof roomId !== 'string' || roomId.length === 0 || roomId.length > 64) return false;
    return this.sql.transaction(() => {
      const existing = this.sql.exec('SELECT seq FROM entries WHERE room = ?', roomId).toArray();
      if (existing.length > 0) return false;
      this.sql.exec(
        'INSERT INTO entries (room, framework, team_name, players, score, escaped, cycle_ms, date, month) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        roomId,
        entry.framework,
        entry.teamName,
        entry.players,
        entry.score,
        entry.escapedDefects,
        entry.averageCycleMs,
        entry.date,
        entry.date.slice(0, 7),
      );
      for (const framework of Frameworks) this.prune(framework);
      return true;
    });
  }

  /**
   * Returns both frameworks' top lists for the current month and for all time.
   */
  top(): LeaderboardResponse {
    const month = this.currentMonth();
    const lists = (monthly: boolean): LeaderboardLists => ({
      scrum: this.select('scrum', monthly ? month : null).map((row) => row.entry),
      kanban: this.select('kanban', monthly ? month : null).map((row) => row.entry),
    });
    return { month: lists(true), allTime: lists(false) };
  }

  private currentMonth(): string {
    return new Date(this.now()).toISOString().slice(0, 7);
  }

  private select(framework: Framework, month: string | null): Row[] {
    const where = month === null ? 'framework = ?' : 'framework = ? AND month = ?';
    const bindings = month === null ? [framework] : [framework, month];
    const query = `SELECT * FROM entries WHERE ${where} ${orderBy(framework)} LIMIT ${config.leaderboard.top}`;
    return this.sql.exec(query, ...bindings).toArray().map(toRow);
  }

  private prune(framework: Framework): void {
    const keep = new Set<number>();
    for (const row of this.select(framework, null)) keep.add(row.seq);
    for (const row of this.select(framework, this.currentMonth())) keep.add(row.seq);
    const marks = [...keep].map(() => '?').join(', ');
    this.sql.exec(`DELETE FROM entries WHERE framework = ? AND seq NOT IN (${marks})`, framework, ...keep);
  }
}
