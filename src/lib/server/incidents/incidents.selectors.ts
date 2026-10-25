import { all, get } from '../db/client';

export type IncidentRow = {
	id: number;
	type: string;
	subtype: string | null;
	title: string;
	location_label: string;
	area_id: number | null;
	lat: number;
	lon: number;
	status: string;
	severity: string | null;
	casualties: string | null;
	extreme: number;
	summary: string | null;
	advice: string | null;
	verified_by: number | null;
	confirmed_by: string | null;
	verified_at: string | null;
	rejected_by: number | null;
	rejected_reason: string | null;
	rejected_at: string | null;
	closed_at: string | null;
	created_at: string;
	updated_at: string;
};

export type ReportRow = {
	id: number;
	ref: string;
	incident_id: number;
	type: string;
	subtype: string | null;
	severity: string | null;
	casualties: string | null;
	note: string | null;
	lat: number | null;
	lon: number | null;
	location_label: string | null;
	phone: string | null;
	anonymous: number;
	channel: string;
	media_path: string | null;
	media_type: string | null;
	created_at: string;
};

export type AlertRow = {
	id: number;
	incident_id: number | null;
	forecast_id: number | null;
	kind: string;
	body: string;
	body_sw: string | null;
	radius_km: number | null;
	recipients: number;
	delivered: number;
	failed: number;
	user_id: number | null;
	created_at: string;
};

export type QueueRow = IncidentRow & { report_count: number; media_count: number; channels: string; first_report_at: string };

const OPEN = `('new', 'verifying', 'held', 'verified')`;

export const incidentSelectors = {
	byId: (id: number) => get<IncidentRow>('SELECT * FROM incidents WHERE id = ?', id),

	/** What the public sees: verified incidents, plus ones closed in the last 6 hours. */
	publicList: () =>
		all<IncidentRow>(
			`SELECT * FROM incidents
			 WHERE status = 'verified' OR (status = 'closed' AND closed_at > ?)
			 ORDER BY status = 'closed', extreme DESC, COALESCE(verified_at, created_at) DESC`,
			new Date(Date.now() - 6 * 3_600_000).toISOString()
		),

	publicById: (id: number) => get<IncidentRow>(`SELECT * FROM incidents WHERE id = ? AND status IN ('verified', 'closed')`, id),

	/** Team desk queue: everything open, plus anything resolved in the last day. */
	deskQueue: () =>
		all<QueueRow>(
			`SELECT i.*, COUNT(r.id) AS report_count, COUNT(r.media_path) AS media_count,
				GROUP_CONCAT(DISTINCT r.channel) AS channels, MIN(r.created_at) AS first_report_at
			 FROM incidents i LEFT JOIN reports r ON r.incident_id = i.id
			 WHERE i.status IN ${OPEN} OR i.updated_at > ?
			 GROUP BY i.id
			 ORDER BY CASE i.status WHEN 'new' THEN 0 WHEN 'held' THEN 1 WHEN 'verifying' THEN 2 WHEN 'verified' THEN 3 ELSE 4 END,
				i.created_at DESC`,
			new Date(Date.now() - 86_400_000).toISOString()
		),

	/** An open incident of the same kind close by, so repeat reports group together. */
	openNear: (sinceIso: string) =>
		all<IncidentRow>(`SELECT * FROM incidents WHERE status IN ${OPEN} AND created_at > ?`, sinceIso),

	reports: (incidentId: number) =>
		all<ReportRow>('SELECT * FROM reports WHERE incident_id = ? ORDER BY created_at', incidentId),

	reportByRef: (ref: string) => get<ReportRow>('SELECT * FROM reports WHERE ref = ?', ref),

	updates: (incidentId: number) =>
		all<{ id: number; text: string; created_at: string }>(
			'SELECT id, text, created_at FROM incident_updates WHERE incident_id = ? ORDER BY created_at DESC',
			incidentId
		),

	alerts: (incidentId: number) =>
		all<AlertRow>('SELECT * FROM alerts WHERE incident_id = ? ORDER BY created_at DESC', incidentId),

	firstAlert: (incidentId: number) =>
		get<AlertRow>(`SELECT * FROM alerts WHERE incident_id = ? AND kind = 'alert' ORDER BY created_at LIMIT 1`, incidentId),

	briefs: (incidentId: number) =>
		all<{ id: number; token: string; sent_to: string; created_at: string; opened_at: string | null }>(
			'SELECT id, token, sent_to, created_at, opened_at FROM briefs WHERE incident_id = ? ORDER BY created_at DESC',
			incidentId
		),

	/** How many earlier reports from this number turned out to be false. */
	rejectedCountForPhone: (phone: string) =>
		get<{ n: number }>(
			`SELECT COUNT(DISTINCT i.id) AS n FROM reports r JOIN incidents i ON i.id = r.incident_id
			 WHERE r.phone = ? AND i.status = 'rejected'`,
			phone
		)?.n ?? 0
};
