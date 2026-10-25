import { get, insert, minutesAgo, run, transaction } from './client';
import { AREA_SEED, areas } from '../areas/areas.selectors';
import { auth } from '../auth/auth.service';
import { subscribers } from '../subscribers/subscribers.service';
import { templates } from '../messaging/templates';
import type { IncidentType } from '../../constants';

// Dummy data for demos. Runs once, on an empty database.

// Demo team password; override with DEMO_PASSWORD. Documented in README.
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'qinga-demo';

function rng(seed: number) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const event = (entityId: number, action: string, actor: string, detail: string | null, at: string, entity = 'incident') =>
	insert('INSERT INTO events (entity, entity_id, action, actor, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)', entity, entityId, action, actor, detail, at);

function areaId(name: string): number {
	return get<{ id: number }>('SELECT id FROM areas WHERE name = ?', name)!.id;
}

type SeedIncident = {
	type: IncidentType;
	subtype: string;
	area: string;
	label: string;
	offset: [number, number];
	status: string;
	severity: string;
	casualties: string;
	extreme?: boolean;
	summary?: string;
	advice?: string;
	createdMins: number;
	reports: { channel: string; phone: string | null; note: string; mins: number; media?: boolean }[];
};

function addIncident(s: SeedIncident): number {
	const area = areas.byId(areaId(s.area))!;
	const lat = area.lat + s.offset[0];
	const lon = area.lon + s.offset[1];
	const created = minutesAgo(s.createdMins);
	const titleType = { fire: 'Fire', accident: 'Accident', disaster: 'Natural disaster', unknown: 'Quick report' }[s.type];
	const id = insert(
		`INSERT INTO incidents (type, subtype, title, location_label, area_id, lat, lon, status, severity, casualties, extreme, summary, advice, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		s.type, s.subtype, `${titleType} · ${s.area}`, s.label, area.id, lat, lon, s.status, s.severity, s.casualties,
		s.extreme ? 1 : 0, s.summary ?? null, s.advice ?? null, created, created
	);
	s.reports.forEach((r, i) => {
		const at = minutesAgo(r.mins);
		const rid = insert(
			`INSERT INTO reports (ref, incident_id, type, subtype, severity, casualties, note, lat, lon, area_id, location_label, phone, anonymous, channel, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			`SEED-${id}-${i}`, id, s.type, s.subtype, s.severity, s.casualties, r.note, lat, lon, area.id, s.label,
			r.phone, r.phone ? 0 : 1, r.channel, at
		);
		run('UPDATE reports SET ref = ? WHERE id = ?', `QG-${2000 + rid}`, rid);
		const who = r.phone ? `${r.phone.replace('+254', '0').slice(0, 2)}•• ••• ${r.phone.slice(-3)}` : 'Anonymous';
		event(id, i === 0 ? 'report_received' : 'report_grouped', who, `QG-${2000 + rid} via ${r.channel}`, at);
	});
	return id;
}

function addAlert(incidentId: number, kind: string, body: string, bodySw: string | null, radiusKm: number, userId: number, mins: number) {
	const incident = get<{ lat: number; lon: number; area_id: number }>('SELECT lat, lon, area_id FROM incidents WHERE id = ?', incidentId)!;
	const recipients = subscribers.near(incident.lat, incident.lon, radiusKm, incident.area_id);
	const at = minutesAgo(mins);
	const alertId = insert(
		`INSERT INTO alerts (incident_id, kind, body, body_sw, radius_km, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		incidentId, kind, body, bodySw, radiusKm, userId, at
	);
	let delivered = 0;
	recipients.forEach((r) => {
		const failed = Number(r.phone.slice(-2)) < 3;
		if (!failed) delivered++;
		insert(
			`INSERT INTO sms_messages (alert_id, direction, channel, phone, body, status, provider, provider_id, created_at, updated_at)
			 VALUES (?, 'out', 'sms', ?, ?, ?, 'simulated', ?, ?, ?)`,
			alertId, r.phone, r.language === 'sw' && bodySw ? bodySw : body, failed ? 'failed' : 'delivered', `seed-${alertId}-${r.phone}`, at, at
		);
	});
	run('UPDATE alerts SET recipients = ?, delivered = ?, failed = ? WHERE id = ?', recipients.length, delivered, recipients.length - delivered, alertId);
	return recipients.length;
}

export function seedIfEmpty() {
	if (get<{ n: number }>('SELECT COUNT(*) AS n FROM users')!.n > 0) return;
	transaction(() => {
		const wanjiku = auth.createUser('Wanjiku M.', 'wanjiku@qinga.test', DEMO_PASSWORD, 'team', 'Qinga');
		const brian = auth.createUser('Brian O.', 'brian@qinga.test', DEMO_PASSWORD, 'team', 'Qinga');
		auth.createUser('J. Mwangi', 'redcross@qinga.test', DEMO_PASSWORD, 'partner', 'Kenya Red Cross');

		for (const a of AREA_SEED) insert('INSERT INTO areas (name, lat, lon, watch) VALUES (?, ?, ?, ?)', a.name, a.lat, a.lon, a.watch);

		// ~420 dummy subscribers spread across the areas.
		const rand = rng(42);
		const list = areas.list();
		const seen = new Set<string>();
		while (seen.size < 420) {
			const phone = `+2547${String(Math.floor(rand() * 1e8)).padStart(8, '0')}`;
			if (seen.has(phone)) continue;
			seen.add(phone);
			const area = list[Math.floor(rand() * list.length)];
			insert(
				'INSERT INTO subscribers (phone, area_id, language, source, created_at) VALUES (?, ?, ?, ?, ?)',
				phone, area.id, rand() < 0.3 ? 'sw' : 'en', rand() < 0.4 ? 'sms' : 'web', minutesAgo(Math.floor(rand() * 40000))
			);
		}

		const repeatFaker = '+254711000999';

		// Verified, extreme fire with alert, update and a Red Cross brief that has been opened.
		const fire = addIncident({
			type: 'fire', subtype: 'Market', area: 'Gikomba', label: 'Gikomba market, shoe section', offset: [0.0008, 0.001],
			status: 'verified', severity: 'Critical', casualties: 'Not sure', extreme: true,
			summary: 'Fire brigade on site. Keep clear of the market.', advice: 'Do not go back for goods. Keep the road clear for fire engines.',
			createdMins: 95,
			reports: [
				{ channel: 'whatsapp', phone: '+254722418310', note: 'Fire at Gikomba, near the shoe section. Very big smoke', mins: 95, media: true },
				{ channel: 'app', phone: '+254733902114', note: 'Stalls burning, people running', mins: 92 }
			]
		});
		run(`UPDATE incidents SET verified_by = ?, verified_at = ?, confirmed_by = ?, updated_at = ? WHERE id = ?`, brian, minutesAgo(81), 'A. Njeri (Red Cross)', minutesAgo(55), fire);
		event(fire, 'picked_up', 'Brian O.', 'Checking with Red Cross', minutesAgo(89));
		event(fire, 'verified', 'Brian O.', 'Confirmed by A. Njeri (Red Cross)', minutesAgo(81));
		insert(`INSERT INTO briefs (incident_id, token, sent_to, user_id, created_at, opened_at) VALUES (?, 'demo-brief-gikomba', 'Kenya Red Cross · Nairobi desk (demo inbox)', ?, ?, ?)`, fire, brian, minutesAgo(80), minutesAgo(79));
		event(fire, 'brief_sent', 'Brian O.', 'To Kenya Red Cross · Nairobi desk (demo inbox)', minutesAgo(80));
		event(fire, 'brief_opened', 'Kenya Red Cross · Nairobi desk (demo inbox)', null, minutesAgo(79));
		const fireMsg = templates.incidentAlert('fire', 'Gikomba market, shoe section', 'Fire brigade on site. Keep clear of the market.');
		const n1 = addAlert(fire, 'alert', fireMsg.en, fireMsg.sw, 2, brian, 75);
		event(fire, 'alert_sent', 'Brian O.', `SMS to ${n1} people within 2 km`, minutesAgo(75));
		insert('INSERT INTO incident_updates (incident_id, text, user_id, created_at) VALUES (?, ?, ?, ?)', fire, 'Fire brigade working to contain it.', brian, minutesAgo(55));
		event(fire, 'update_posted', 'Brian O.', 'Fire brigade working to contain it.', minutesAgo(55));

		// Verified accident with alert and update.
		const accident = addIncident({
			type: 'accident', subtype: 'Vehicles crashed', area: 'Roysambu', label: 'Thika Rd outbound, near Roysambu footbridge', offset: [0.0006, -0.0012],
			status: 'verified', severity: 'Serious', casualties: '3–5',
			summary: 'Two outbound lanes blocked. Expect heavy traffic or use another route.', advice: "Don't stop to film. Keep the road clear for ambulances.",
			createdMins: 62,
			reports: [
				{ channel: 'app', phone: '+254712345412', note: 'Matatu and lorry crashed, people hurt', mins: 62, media: true },
				{ channel: 'app', phone: '+254798110233', note: 'Two lanes blocked', mins: 60 },
				{ channel: 'sms', phone: '+254701556780', note: 'ACCIDENT Thika Rd Roysambu', mins: 57 }
			]
		});
		run(`UPDATE incidents SET verified_by = ?, verified_at = ?, confirmed_by = ?, updated_at = ? WHERE id = ?`, wanjiku, minutesAgo(48), 'J. Mwangi (Red Cross)', minutesAgo(12), accident);
		event(accident, 'picked_up', 'Wanjiku M.', 'Checking with Red Cross', minutesAgo(55));
		event(accident, 'verified', 'Wanjiku M.', 'Confirmed by J. Mwangi (Red Cross)', minutesAgo(48));
		insert(`INSERT INTO briefs (incident_id, token, sent_to, user_id, created_at, opened_at) VALUES (?, 'demo-brief-thikard', 'Kenya Red Cross · Nairobi desk (demo inbox)', ?, ?, ?)`, accident, wanjiku, minutesAgo(46), minutesAgo(45));
		event(accident, 'brief_sent', 'Wanjiku M.', 'To Kenya Red Cross · Nairobi desk (demo inbox)', minutesAgo(46));
		event(accident, 'brief_opened', 'Kenya Red Cross · Nairobi desk (demo inbox)', null, minutesAgo(45));
		const accMsg = templates.incidentAlert('accident', 'Thika Rd near Roysambu', 'Two outbound lanes blocked. Use another route.');
		const n2 = addAlert(accident, 'alert', accMsg.en, accMsg.sw, 3, wanjiku, 42);
		event(accident, 'alert_sent', 'Wanjiku M.', `SMS to ${n2} people within 3 km`, minutesAgo(42));
		insert('INSERT INTO incident_updates (incident_id, text, user_id, created_at) VALUES (?, ?, ?, ?)', accident, 'One lane reopened.', wanjiku, minutesAgo(12));
		event(accident, 'update_posted', 'Wanjiku M.', 'One lane reopened.', minutesAgo(12));
		const upd = templates.update('Thika Rd near Roysambu', 'One lane reopened.');
		const n3 = addAlert(accident, 'update', upd.en, upd.sw, 3, wanjiku, 12);
		event(accident, 'update_sms_sent', 'Wanjiku M.', `SMS to ${n3} people`, minutesAgo(12));

		// Being checked right now.
		const flood = addIncident({
			type: 'disaster', subtype: 'Flood', area: 'Mukuru kwa Njenga', label: 'Mukuru kwa Njenga, near the river', offset: [-0.001, 0.0005],
			status: 'verifying', severity: 'Serious', casualties: 'Not sure', createdMins: 25,
			reports: [
				{ channel: 'sms', phone: '+254726004118', note: 'FLOOD Mukuru kwa Njenga water over the road', mins: 25 },
				{ channel: 'sms', phone: '+254745220913', note: 'DISASTER Mukuru houses flooding near river', mins: 21 }
			]
		});
		event(flood, 'picked_up', 'Brian O.', 'Checking with Red Cross', minutesAgo(15));

		// Two false reports from the same number, so their next report is held.
		const fake1 = addIncident({
			type: 'fire', subtype: 'Building', area: 'Kawangware', label: 'Kawangware 56', offset: [0, 0],
			status: 'rejected', severity: 'Critical', casualties: 'Not sure', createdMins: 2900,
			reports: [{ channel: 'app', phone: repeatFaker, note: 'Big fire at Kawangware', mins: 2900 }]
		});
		run(`UPDATE incidents SET rejected_by = ?, rejected_at = ?, rejected_reason = ?, updated_at = ? WHERE id = ?`, wanjiku, minutesAgo(2870), 'No fire found on site (Red Cross checked)', minutesAgo(2870), fake1);
		event(fake1, 'rejected', 'Wanjiku M.', 'No fire found on site (Red Cross checked)', minutesAgo(2870));
		const fake2 = addIncident({
			type: 'accident', subtype: 'Overturned', area: 'Mombasa Rd, Cabanas', label: 'Mombasa Rd near Cabanas', offset: [0, 0],
			status: 'rejected', severity: 'Critical', casualties: '6+', createdMins: 300,
			reports: [{ channel: 'app', phone: repeatFaker, note: 'Bus overturned on Mombasa road', mins: 300, media: true }]
		});
		run(`UPDATE incidents SET rejected_by = ?, rejected_at = ?, rejected_reason = ?, updated_at = ? WHERE id = ?`, wanjiku, minutesAgo(288), 'Old photo found online', minutesAgo(288), fake2);
		event(fake2, 'rejected', 'Wanjiku M.', 'Old photo found online', minutesAgo(288));
		const held = addIncident({
			type: 'fire', subtype: 'Building', area: 'Kibera', label: 'Kibera, Olympic estate', offset: [0.001, 0],
			status: 'held', severity: 'Critical', casualties: 'Not sure', createdMins: 8,
			reports: [{ channel: 'app', phone: repeatFaker, note: 'Huge fire Kibera', mins: 8 }]
		});
		event(held, 'held', 'system', '07•• ••• 999 has 2+ false reports', minutesAgo(8));

		// Brand new, nobody has picked it up yet.
		addIncident({
			type: 'accident', subtype: 'Boda boda', area: 'Westlands', label: 'Waiyaki Way near Westlands roundabout', offset: [0.0004, 0.0009],
			status: 'new', severity: 'Minor', casualties: '1–2', createdMins: 3,
			reports: [{ channel: 'app', phone: '+254790331245', note: 'Boda boda hit by a car, rider hurt', mins: 3 }]
		});

		// Rumours.
		const r1 = insert(`INSERT INTO rumours (text, status, verdict, channel, resolved_by, resolved_at, created_at) VALUES (?, 'false', ?, 'whatsapp', ?, ?, ?)`,
			'Video of a bridge falling on Thika Rd', 'Old video from another country. Thika Rd bridges are fine.', brian, minutesAgo(30), minutesAgo(70));
		event(r1, 'submitted', 'Public via whatsapp', 'Video of a bridge falling on Thika Rd', minutesAgo(70), 'rumour');
		event(r1, 'marked_false', 'Brian O.', 'Old video from another country. Thika Rd bridges are fine.', minutesAgo(30), 'rumour');
		const r2 = insert(`INSERT INTO rumours (text, status, channel, created_at) VALUES (?, 'checking', 'app', ?)`, 'Fire at Toi market', minutesAgo(10));
		event(r2, 'submitted', 'Public via app', 'Fire at Toi market', minutesAgo(10), 'rumour');
		const r3 = insert(`INSERT INTO rumours (text, status, verdict, incident_id, channel, resolved_by, resolved_at, created_at) VALUES (?, 'true', ?, ?, 'app', ?, ?, ?)`,
			'Accident on Thika Rd near Roysambu', 'Verified. Two lanes blocked.', accident, wanjiku, minutesAgo(44), minutesAgo(50));
		event(r3, 'marked_true', 'Wanjiku M.', 'Verified. Two lanes blocked.', minutesAgo(44), 'rumour');
	});
	console.log('[seed] demo data created');
}
