import { randomBytes } from 'node:crypto';
import { get, insert, nowIso, run } from '../db/client';
import { audit } from '../audit/audit.service';

type Actor = { id: number; name: string };

export type BriefRow = {
	id: number;
	incident_id: number | null;
	forecast_id: number | null;
	token: string;
	sent_to: string;
	created_at: string;
	opened_at: string | null;
};

// In the prototype the brief is a private link "sent" to a demo Red Cross inbox; opening it is tracked.
const RECIPIENT = process.env.REDCROSS_BRIEF_TO || 'Kenya Red Cross · Nairobi desk (demo inbox)';

class BriefsService {
	send(target: { incidentId?: number; forecastId?: number }, user: Actor): BriefRow {
		const token = randomBytes(12).toString('hex');
		const id = insert(
			'INSERT INTO briefs (incident_id, forecast_id, token, sent_to, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
			target.incidentId ?? null,
			target.forecastId ?? null,
			token,
			RECIPIENT,
			user.id,
			nowIso()
		);
		if (target.incidentId) audit.record('incident', target.incidentId, 'brief_sent', user.name, `To ${RECIPIENT}`);
		if (target.forecastId) audit.record('forecast', target.forecastId, 'brief_sent', user.name, `To ${RECIPIENT}`);
		return get<BriefRow>('SELECT * FROM briefs WHERE id = ?', id)!;
	}

	/** Opening the link counts as "seen by Red Cross". */
	open(token: string): BriefRow | undefined {
		const brief = get<BriefRow>('SELECT * FROM briefs WHERE token = ?', token);
		if (!brief) return undefined;
		if (!brief.opened_at) {
			run('UPDATE briefs SET opened_at = ? WHERE id = ?', nowIso(), brief.id);
			const entity = brief.incident_id ? 'incident' : 'forecast';
			audit.record(entity, brief.incident_id ?? brief.forecast_id, 'brief_opened', RECIPIENT);
		}
		return get<BriefRow>('SELECT * FROM briefs WHERE id = ?', brief.id);
	}
}

export const briefs = new BriefsService();
