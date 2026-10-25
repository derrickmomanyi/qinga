import { rumours } from '#lib/server/rumours/rumours.service.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	rumours: rumours.publicList().map(({ id, text, status, verdict, incident_id }) => ({ id, text, status, verdict, incident_id }))
});
