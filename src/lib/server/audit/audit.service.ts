import { EventEmitter } from 'node:events';
import { all, insert, nowIso } from '../db/client';

export type ChangeEvent = { entity: string; entityId: number | null; action: string };

export type AuditEntry = {
	id: number;
	entity: string;
	entity_id: number | null;
	action: string;
	actor: string;
	detail: string | null;
	created_at: string;
};

const store = globalThis as typeof globalThis & { __qingaBus?: EventEmitter };

class AuditService {
	// Live-update channel for the SSE stream (dashboard and public pages refresh on change).
	readonly bus: EventEmitter = store.__qingaBus ?? (store.__qingaBus = new EventEmitter().setMaxListeners(500));

	record(entity: string, entityId: number | null, action: string, actor: string, detail?: string, at = nowIso()) {
		insert(
			'INSERT INTO events (entity, entity_id, action, actor, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)',
			entity,
			entityId,
			action,
			actor,
			detail ?? null,
			at
		);
		this.broadcast({ entity, entityId, action });
	}

	broadcast(event: ChangeEvent) {
		this.bus.emit('change', event);
	}

	trail(entity: string, entityId: number): AuditEntry[] {
		return all<AuditEntry>(
			'SELECT * FROM events WHERE entity = ? AND entity_id = ? ORDER BY created_at, id',
			entity,
			entityId
		);
	}
}

export const audit = new AuditService();
