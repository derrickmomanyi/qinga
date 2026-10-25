import { all, get, insert, nowIso, run } from '../db/client';
import { audit } from '../audit/audit.service';
import { ValidationError } from '../shared/validation';

type Actor = { id: number; name: string };

export type RumourRow = {
	id: number;
	text: string;
	media_path: string | null;
	status: 'checking' | 'true' | 'false';
	verdict: string | null;
	incident_id: number | null;
	channel: string;
	resolved_at: string | null;
	created_at: string;
};

export const RUMOUR_STATUSES = ['checking', 'true', 'false'] as const;

class RumoursService {
	submit(text: string, mediaPath: string | null, channel: 'app' | 'sms' | 'whatsapp'): number {
		const id = insert(
			'INSERT INTO rumours (text, media_path, channel, created_at) VALUES (?, ?, ?, ?)',
			text,
			mediaPath,
			channel,
			nowIso()
		);
		audit.record('rumour', id, 'submitted', `Public via ${channel}`, text.slice(0, 120));
		return id;
	}

	resolve(id: number, user: Actor, status: (typeof RUMOUR_STATUSES)[number], verdict: string | null, incidentId: number | null) {
		if (!get('SELECT id FROM rumours WHERE id = ?', id)) throw new ValidationError('Rumour not found');
		if (status !== 'checking' && !verdict) throw new ValidationError('Say what is true so people can share the correction', 'verdict');
		run(
			'UPDATE rumours SET status = ?, verdict = ?, incident_id = ?, resolved_by = ?, resolved_at = ? WHERE id = ?',
			status,
			verdict,
			incidentId,
			status === 'checking' ? null : user.id,
			status === 'checking' ? null : nowIso(),
			id
		);
		audit.record('rumour', id, `marked_${status}`, user.name, verdict ?? undefined);
	}

	publicList = () => all<RumourRow>('SELECT * FROM rumours ORDER BY created_at DESC LIMIT 30');

	queue = () =>
		all<RumourRow>(`SELECT * FROM rumours ORDER BY status != 'checking', created_at DESC LIMIT 100`);
}

export const rumours = new RumoursService();
