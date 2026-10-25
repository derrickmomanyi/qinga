import type { PageServerLoad } from './$types';
import { rumours } from '#lib/server/rumours/rumours.service.ts';
import { incidentSelectors } from '#lib/server/incidents/incidents.selectors.ts';

export const load: PageServerLoad = async ({ parent }) => {
	await parent(); // signed-in check happens in the layout
	return {
		rumours: rumours.queue(),
		incidents: incidentSelectors.publicList().map(({ id, title, location_label }) => ({ id, title, location_label }))
	};
};
