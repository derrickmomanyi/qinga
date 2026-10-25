import { all } from '../db/client';
import { audit, type AuditEntry } from '../audit/audit.service';

export type ReportingRow = {
	id: number;
	type: string;
	title: string;
	location_label: string;
	status: string;
	rejected_reason: string | null;
	created_at: string;
	first_report_at: string | null;
	report_count: number;
	channels: string | null;
	verified_by_name: string | null;
	verified_at: string | null;
	rejected_by_name: string | null;
	rejected_at: string | null;
	confirmed_by: string | null;
	closed_at: string | null;
	alert_at: string | null;
	alert_recipients: number | null;
	alert_delivered: number | null;
	alert_failed: number | null;
	brief_at: string | null;
	brief_opened_at: string | null;
};

export const PERIODS = { today: 1, week: 7, month: 30 } as const;
export type Period = keyof typeof PERIODS;

export const reporting = {
	rows(period: Period): ReportingRow[] {
		const since = new Date(Date.now() - PERIODS[period] * 86_400_000).toISOString();
		return all<ReportingRow>(
			`SELECT i.id, i.type, i.title, i.location_label, i.status, i.rejected_reason, i.created_at, i.confirmed_by,
				i.verified_at, i.rejected_at, i.closed_at,
				(SELECT MIN(created_at) FROM reports WHERE incident_id = i.id) AS first_report_at,
				(SELECT COUNT(*) FROM reports WHERE incident_id = i.id) AS report_count,
				(SELECT GROUP_CONCAT(DISTINCT channel) FROM reports WHERE incident_id = i.id) AS channels,
				vu.name AS verified_by_name, ru.name AS rejected_by_name,
				fa.created_at AS alert_at, fa.recipients AS alert_recipients, fa.delivered AS alert_delivered, fa.failed AS alert_failed,
				fb.created_at AS brief_at, fb.opened_at AS brief_opened_at
			 FROM incidents i
			 LEFT JOIN users vu ON vu.id = i.verified_by
			 LEFT JOIN users ru ON ru.id = i.rejected_by
			 LEFT JOIN alerts fa ON fa.id = (SELECT id FROM alerts WHERE incident_id = i.id AND kind = 'alert' ORDER BY created_at LIMIT 1)
			 LEFT JOIN briefs fb ON fb.id = (SELECT id FROM briefs WHERE incident_id = i.id ORDER BY created_at LIMIT 1)
			 WHERE i.created_at > ?
			 ORDER BY i.created_at DESC`,
			since
		);
	},

	deliveries(incidentId: number) {
		return all<{ kind: string; created_at: string; recipients: number; delivered: number; failed: number }>(
			'SELECT kind, created_at, recipients, delivered, failed FROM alerts WHERE incident_id = ? ORDER BY created_at',
			incidentId
		);
	},

	trail(incidentId: number): AuditEntry[] {
		return audit.trail('incident', incidentId);
	},

	csv(rows: ReportingRow[]): string {
		const head = [
			'id', 'type', 'title', 'location', 'status', 'first_report_at', 'reports', 'channels', 'processed_by',
			'verified_at', 'confirmed_by', 'rejected_reason', 'sms_sent_at', 'sms_recipients', 'sms_delivered', 'sms_failed',
			'brief_sent_at', 'brief_opened_at', 'closed_at'
		];
		const cell = (v: unknown) => {
			const s = v == null ? '' : String(v);
			return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
		};
		const lines = rows.map((r) =>
			[
				r.id, r.type, r.title, r.location_label, r.status, r.first_report_at, r.report_count, r.channels,
				r.verified_by_name ?? r.rejected_by_name, r.verified_at, r.confirmed_by, r.rejected_reason, r.alert_at,
				r.alert_recipients, r.alert_delivered, r.alert_failed, r.brief_at, r.brief_opened_at, r.closed_at
			]
				.map(cell)
				.join(',')
		);
		return [head.join(','), ...lines].join('\n');
	}
};
