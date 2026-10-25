import { randomBytes } from 'node:crypto';
import { insert, nowIso, run, transaction } from '../db/client';
import { audit } from '../audit/audit.service';
import { areas, type Area } from '../areas/areas.selectors';
import { messaging } from '../messaging/messaging.service';
import { templates } from '../messaging/templates';
import { subscribers } from '../subscribers/subscribers.service';
import { nominatim } from '../providers/geocoding/nominatim.client';
import { distanceKm } from '../shared/geo';
import { maskPhone } from '../shared/phone';
import { ValidationError } from '../shared/validation';
import { NAIROBI, SEVERITIES, TYPES, typeOf, type IncidentType } from '../../constants';
import { incidentSelectors as q, type IncidentRow } from './incidents.selectors';

type Actor = { id: number; name: string };

export type ReportInput = {
	type: IncidentType;
	subtype: string | null;
	severity: string | null;
	casualties: string | null;
	note: string | null;
	lat: number | null;
	lon: number | null;
	areaId: number | null;
	locationLabel: string | null;
	phone: string | null;
	anonymous: boolean;
	channel: 'app' | 'quick' | 'sms' | 'whatsapp';
	mediaPath: string | null;
	mediaType: string | null;
};

const GROUP_RADIUS_KM = 0.6;
const GROUP_WINDOW_MS = 3 * 3_600_000;
const HOLD_AFTER_FALSE_REPORTS = 2;

class IncidentsService {
	/** A new report from the app, SMS or WhatsApp. Groups it with a nearby open incident or opens a new one. */
	async intake(input: ReportInput) {
		const where = await this.resolveLocation(input);
		const phone = input.anonymous ? null : input.phone;
		const reporter = phone ? maskPhone(phone) : 'Anonymous';
		const at = nowIso();

		const result = transaction(() => {
			let incident = this.findGroup(input.type, where.lat, where.lon);
			let created = false;
			if (incident) {
				this.mergeInto(incident, input, at);
			} else {
				const held = phone ? q.rejectedCountForPhone(phone) >= HOLD_AFTER_FALSE_REPORTS : false;
				const id = insert(
					`INSERT INTO incidents (type, subtype, title, location_label, area_id, lat, lon, status, severity, casualties, created_at, updated_at)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					input.type,
					input.subtype,
					`${TYPES[input.type].label} · ${where.area.name}`,
					where.label,
					where.area.id,
					where.lat,
					where.lon,
					held ? 'held' : 'new',
					input.severity,
					input.casualties,
					at,
					at
				);
				incident = q.byId(id)!;
				created = true;
				if (held) audit.record('incident', id, 'held', 'system', `${reporter} has ${HOLD_AFTER_FALSE_REPORTS}+ false reports`);
			}

			const reportId = insert(
				`INSERT INTO reports (ref, incident_id, type, subtype, severity, casualties, note, lat, lon, area_id, location_label, phone, anonymous, channel, media_path, media_type, created_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				`TMP-${randomBytes(6).toString('hex')}`,
				incident.id,
				input.type,
				input.subtype,
				input.severity,
				input.casualties,
				input.note,
				input.lat,
				input.lon,
				where.area.id,
				where.label,
				phone,
				input.anonymous ? 1 : 0,
				input.channel,
				input.mediaPath,
				input.mediaType,
				at
			);
			const ref = `QG-${2000 + reportId}`;
			run('UPDATE reports SET ref = ? WHERE id = ?', ref, reportId);
			audit.record(
				'incident',
				incident.id,
				created ? 'report_received' : 'report_grouped',
				reporter,
				`${ref} via ${input.channel}${input.mediaPath ? ' with ' + input.mediaType : ''}`
			);
			return { ref, incidentId: incident.id, type: input.type, created };
		});

		if (phone) {
			const channel = input.channel === 'whatsapp' ? 'whatsapp' : 'sms';
			await messaging.send([phone], templates.reporterAck(result.ref, input.type), { channel });
		}
		return result;
	}

	markVerifying(id: number, user: Actor) {
		const incident = this.mustGet(id);
		if (!['new', 'held'].includes(incident.status)) return;
		run(`UPDATE incidents SET status = 'verifying', updated_at = ? WHERE id = ?`, nowIso(), id);
		audit.record('incident', id, 'picked_up', user.name, 'Checking with Red Cross');
	}

	verify(id: number, user: Actor, input: { confirmedBy: string; summary: string; advice: string | null; severity: string | null; extreme: boolean }) {
		const incident = this.mustGet(id);
		if (!['new', 'held', 'verifying'].includes(incident.status)) throw new ValidationError(`This incident is already ${incident.status}`);
		if (input.severity && !SEVERITIES.includes(input.severity)) throw new ValidationError('Unknown severity', 'severity');
		const at = nowIso();
		run(
			`UPDATE incidents SET status = 'verified', confirmed_by = ?, summary = ?, advice = ?, severity = COALESCE(?, severity),
				extreme = ?, verified_by = ?, verified_at = ?, updated_at = ? WHERE id = ?`,
			input.confirmedBy,
			input.summary,
			input.advice,
			input.severity,
			input.extreme ? 1 : 0,
			user.id,
			at,
			at,
			id
		);
		audit.record('incident', id, 'verified', user.name, `Confirmed by ${input.confirmedBy}`);
	}

	reject(id: number, user: Actor, reason: string) {
		const incident = this.mustGet(id);
		if (['rejected', 'closed'].includes(incident.status)) throw new ValidationError(`This incident is already ${incident.status}`);
		const at = nowIso();
		run(
			`UPDATE incidents SET status = 'rejected', rejected_by = ?, rejected_reason = ?, rejected_at = ?, updated_at = ? WHERE id = ?`,
			user.id,
			reason,
			at,
			at,
			id
		);
		audit.record('incident', id, 'rejected', user.name, reason);
	}

	recipientsFor(incident: IncidentRow, radiusKm: number) {
		return subscribers.near(incident.lat, incident.lon, radiusKm, incident.area_id);
	}

	async sendAlert(id: number, user: Actor, input: { body: string; bodySw: string | null; radiusKm: number }) {
		const incident = this.mustGet(id);
		if (incident.status !== 'verified') throw new ValidationError('Only verified incidents can be sent to the public');
		const recipients = this.recipientsFor(incident, input.radiusKm);
		const alertId = insert(
			`INSERT INTO alerts (incident_id, kind, body, body_sw, radius_km, user_id, created_at) VALUES (?, 'alert', ?, ?, ?, ?, ?)`,
			id,
			input.body,
			input.bodySw,
			input.radiusKm,
			user.id,
			nowIso()
		);
		const result = await messaging.sendLocalized(recipients, { en: input.body, sw: input.bodySw }, alertId);
		audit.record('incident', id, 'alert_sent', user.name, `SMS to ${recipients.length} people within ${input.radiusKm} km`);
		return { alertId, recipients: recipients.length, ...result };
	}

	async addUpdate(id: number, user: Actor, text: string, sendSms: boolean) {
		const incident = this.mustGet(id);
		insert('INSERT INTO incident_updates (incident_id, text, user_id, created_at) VALUES (?, ?, ?, ?)', id, text, user.id, nowIso());
		run('UPDATE incidents SET updated_at = ? WHERE id = ?', nowIso(), id);
		audit.record('incident', id, 'update_posted', user.name, text);
		if (!sendSms) return { recipients: 0 };
		return this.followUp(incident, user, 'update', templates.update(incident.location_label, text));
	}

	async close(id: number, user: Actor, sendAllClear: boolean) {
		const incident = this.mustGet(id);
		const at = nowIso();
		run(`UPDATE incidents SET status = 'closed', closed_by = ?, closed_at = ?, updated_at = ? WHERE id = ?`, user.id, at, at, id);
		audit.record('incident', id, 'closed', user.name);
		if (sendAllClear && incident.status === 'verified') {
			return this.followUp(incident, user, 'all_clear', templates.allClear(incident.title));
		}
		return { recipients: 0 };
	}

	defaultMessage(incident: IncidentRow) {
		return templates.incidentAlert(typeOf(incident.type), incident.location_label, incident.summary);
	}

	/** Updates and all-clears go to the same radius as the first alert. */
	private async followUp(incident: IncidentRow, user: Actor, kind: 'update' | 'all_clear', bodies: { en: string; sw: string }) {
		const first = q.firstAlert(incident.id);
		if (!first) return { recipients: 0 };
		const recipients = this.recipientsFor(incident, first.radius_km ?? 3);
		const alertId = insert(
			`INSERT INTO alerts (incident_id, kind, body, body_sw, radius_km, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
			incident.id,
			kind,
			bodies.en,
			bodies.sw,
			first.radius_km,
			user.id,
			nowIso()
		);
		await messaging.sendLocalized(recipients, bodies, alertId);
		audit.record('incident', incident.id, kind === 'update' ? 'update_sms_sent' : 'all_clear_sent', user.name, `SMS to ${recipients.length} people`);
		return { recipients: recipients.length };
	}

	private mustGet(id: number): IncidentRow {
		const incident = q.byId(id);
		if (!incident) throw new ValidationError('Incident not found');
		return incident;
	}

	private findGroup(type: IncidentType, lat: number, lon: number): IncidentRow | undefined {
		const since = new Date(Date.now() - GROUP_WINDOW_MS).toISOString();
		return q
			.openNear(since)
			.filter((i) => i.type === type || i.type === 'unknown' || type === 'unknown')
			.map((i) => ({ i, d: distanceKm(lat, lon, i.lat, i.lon) }))
			.filter(({ d }) => d <= GROUP_RADIUS_KM)
			.sort((a, b) => a.d - b.d)[0]?.i;
	}

	private mergeInto(incident: IncidentRow, input: ReportInput, at: string) {
		const rank = (s: string | null) => (s ? SEVERITIES.indexOf(s) : -1);
		const severity = rank(input.severity) > rank(incident.severity) ? input.severity : incident.severity;
		const type = incident.type === 'unknown' && input.type !== 'unknown' ? input.type : incident.type;
		const title = type !== incident.type ? incident.title.replace(TYPES.unknown.label, TYPES[typeOf(type)].label) : incident.title;
		run(
			`UPDATE incidents SET type = ?, title = ?, subtype = COALESCE(subtype, ?), severity = ?, casualties = COALESCE(?, casualties), updated_at = ? WHERE id = ?`,
			type,
			title,
			input.subtype,
			severity,
			input.casualties,
			at,
			incident.id
		);
	}

	private async resolveLocation(input: ReportInput): Promise<{ lat: number; lon: number; area: Area; label: string }> {
		if (input.lat != null && input.lon != null) {
			const area = areas.nearest(input.lat, input.lon);
			const label = input.locationLabel ?? (await nominatim.placeName(input.lat, input.lon)) ?? area.name;
			return { lat: input.lat, lon: input.lon, area, label };
		}
		const area = (input.areaId && areas.byId(input.areaId)) || areas.nearest(NAIROBI.lat, NAIROBI.lon);
		const label = input.locationLabel ?? (input.areaId ? area.name : `${area.name} (location not given)`);
		return { lat: area.lat, lon: area.lon, area, label };
	}
}

export const incidents = new IncidentsService();
