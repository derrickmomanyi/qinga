import { error } from '@sveltejs/kit';
import { briefs } from '#lib/server/briefs/briefs.service.ts';
import { incidentSelectors } from '#lib/server/incidents/incidents.selectors.ts';
import { forecasts, type ModelPeak } from '#lib/server/forecasts/forecasts.service.ts';
import { audit } from '#lib/server/audit/audit.service.ts';
import { displayPhone } from '#lib/server/shared/phone.ts';
import type { PageServerLoad } from './$types';

// Private Red Cross brief. Opening it marks the brief as seen. Responders get full detail,
// including reporters' phone numbers for follow-up (except people who chose to stay anonymous).
export const load: PageServerLoad = ({ params, setHeaders }) => {
	const brief = briefs.open(params.token);
	if (!brief) error(404, 'Brief not found');
	setHeaders({ 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow' });
	const meta = { sentTo: brief.sent_to, createdAt: brief.created_at };

	if (brief.incident_id) {
		const incident = incidentSelectors.byId(brief.incident_id);
		if (!incident) error(404, 'Incident not found');
		const verified = [...audit.trail('incident', incident.id)].reverse().find((e) => e.action === 'verified');
		return {
			kind: 'incident' as const,
			brief: meta,
			incident,
			verifiedBy: verified?.actor ?? null,
			reports: incidentSelectors.reports(incident.id).map((r) => {
				const phone = r.phone && !r.anonymous ? r.phone : null;
				return { ...r, phone, phoneDisplay: phone ? displayPhone(phone) : null };
			}),
			updates: incidentSelectors.updates(incident.id)
		};
	}

	const forecast = brief.forecast_id ? forecasts.byId(brief.forecast_id) : undefined;
	if (!forecast) error(404, 'Forecast not found');
	let models: ModelPeak[] = [];
	try {
		models = JSON.parse(forecast.models) as ModelPeak[];
	} catch {
		// Older rows may not have per-model detail.
	}
	return { kind: 'forecast' as const, brief: meta, forecast, models };
};
