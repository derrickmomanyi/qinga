import type { PageServerLoad } from './$types';
import { PERIODS, reporting, type Period } from '#lib/server/reporting/reporting.selectors.ts';
import { incidentSelectors } from '#lib/server/incidents/incidents.selectors.ts';

export const load: PageServerLoad = async ({ url, parent }) => {
	await parent(); // signed-in check happens in the layout

	const asked = url.searchParams.get('period') ?? '';
	const period: Period = asked in PERIODS ? (asked as Period) : 'week';
	const rows = reporting.rows(period);

	const id = Number(url.searchParams.get('id')) || rows[0]?.id;
	const incident = id ? incidentSelectors.byId(id) : undefined;

	return {
		period,
		rows,
		selected: incident
			? {
					id: incident.id,
					title: incident.title,
					location_label: incident.location_label,
					trail: reporting.trail(incident.id),
					deliveries: reporting.deliveries(incident.id),
					briefs: incidentSelectors.briefs(incident.id)
				}
			: null
	};
};
