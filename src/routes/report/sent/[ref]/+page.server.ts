import { error } from '@sveltejs/kit';
import { incidentSelectors } from '#lib/server/incidents/incidents.selectors.ts';
import { typeOf } from '#lib/constants.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const report = incidentSelectors.reportByRef(params.ref);
	if (!report) error(404, 'Report not found');
	const incident = incidentSelectors.byId(report.incident_id);
	// Only what the reporter needs to see; never the phone number.
	return {
		ref: report.ref,
		type: typeOf(incident?.type !== 'unknown' ? incident?.type : report.type),
		location: report.location_label || incident?.location_label || null,
		withPhone: !!report.phone && !report.anonymous
	};
};
