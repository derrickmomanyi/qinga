import { error } from '@sveltejs/kit';
import { incidentSelectors } from '#lib/server/incidents/incidents.selectors.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const id = Number(params.id);
	const incident = Number.isInteger(id) ? incidentSelectors.publicById(id) : undefined;
	if (!incident) error(404, 'Alert not found');
	// Reports hold phone numbers: only the first photo or video leaves the server.
	const withMedia = incidentSelectors.reports(id).find((r) => r.media_path);
	return {
		incident,
		photo: withMedia?.media_path ? { path: withMedia.media_path, type: withMedia.media_type } : null,
		updates: incidentSelectors.updates(id)
	};
};
