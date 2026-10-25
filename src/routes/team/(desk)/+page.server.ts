import type { PageServerLoad } from './$types';
import { incidentSelectors } from '#lib/server/incidents/incidents.selectors.ts';
import { incidents } from '#lib/server/incidents/incidents.service.ts';
import { forecasts } from '#lib/server/forecasts/forecasts.service.ts';
import { audit } from '#lib/server/audit/audit.service.ts';
import { subscribers } from '#lib/server/subscribers/subscribers.service.ts';
import { maskPhone } from '#lib/server/shared/phone.ts';

const NO_HURT = [null, '', 'Not sure', 'None'];

export const load: PageServerLoad = async ({ url, parent }) => {
	await parent(); // signed-in check happens in the layout

	const queue = incidentSelectors.deskQueue().map((row) => ({
		...row,
		// Held incidents show why (e.g. "07•• ••• 999 has 2+ false reports").
		held_reason: row.status === 'held' ? (audit.trail('incident', row.id).find((e) => e.action === 'held')?.detail ?? null) : null
	}));
	const pendingForecasts = forecasts.list().filter((f) => f.status === 'forecast');

	const id = Number(url.searchParams.get('id')) || queue[0]?.id;
	const incident = id ? incidentSelectors.byId(id) : undefined;
	if (!incident) return { queue, pendingForecasts, requestedId: id ?? null, selected: null };

	const reports = incidentSelectors.reports(incident.id);
	return {
		queue,
		pendingForecasts,
		requestedId: id,
		selected: {
			incident,
			// Phone numbers stay on the server; the desk sees them masked.
			reports: reports.map(({ phone, ...r }) => ({
				...r,
				reporter: maskPhone(phone),
				earlier_false: phone ? incidentSelectors.rejectedCountForPhone(phone) : 0
			})),
			reporters: new Set(reports.map((r) => r.phone).filter(Boolean)).size,
			hurtMentions: reports.filter((r) => !NO_HURT.includes(r.casualties)).length,
			mediaCount: reports.filter((r) => r.media_path).length,
			updates: incidentSelectors.updates(incident.id),
			alerts: incidentSelectors.alerts(incident.id),
			briefs: incidentSelectors.briefs(incident.id),
			message: incidents.defaultMessage(incident),
			subscriberTotal: subscribers.activeCount()
		}
	};
};
