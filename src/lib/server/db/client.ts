import '../env';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { SCHEMA } from './schema';

export const DATA_DIR = process.env.QINGA_DATA_DIR || join(process.cwd(), 'data');
export const UPLOAD_DIR = join(DATA_DIR, 'uploads');

export type Param = SQLInputValue;

// One connection per process; survives dev-server module reloads.
const store = globalThis as typeof globalThis & { __qingaDb?: DatabaseSync };

function open(): DatabaseSync {
	mkdirSync(UPLOAD_DIR, { recursive: true });
	const db = new DatabaseSync(join(DATA_DIR, 'qinga.db'));
	db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
	db.exec(SCHEMA);
	return db;
}

export const db: DatabaseSync = store.__qingaDb ?? (store.__qingaDb = open());

export function all<T>(sql: string, ...params: Param[]): T[] {
	return db.prepare(sql).all(...params) as T[];
}

export function get<T>(sql: string, ...params: Param[]): T | undefined {
	return db.prepare(sql).get(...params) as T | undefined;
}

export function run(sql: string, ...params: Param[]) {
	return db.prepare(sql).run(...params);
}

export function insert(sql: string, ...params: Param[]): number {
	return Number(run(sql, ...params).lastInsertRowid);
}

export function transaction<T>(fn: () => T): T {
	db.exec('BEGIN');
	try {
		const result = fn();
		db.exec('COMMIT');
		return result;
	} catch (err) {
		db.exec('ROLLBACK');
		throw err;
	}
}

export const nowIso = () => new Date().toISOString();

export const minutesAgo = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();
