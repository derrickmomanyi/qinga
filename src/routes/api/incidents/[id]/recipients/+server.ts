import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { incidents } from '#lib/server/incidents/incidents.service.ts';
import { incidentSelectors } from '#lib/server/incidents/incidents.selectors.ts';
import { requireUser } from '#lib/server/shared/http.ts';

// How many subscribers an alert would reach at a given radius.
export const GET: RequestHandler = ({ params, locals, url }) => {
	requireUser(locals);
	const incident = incidentSelectors.byId(Number(params.id));
	if (!incident) error(404, 'Incident not found');
	const radius = Math.min(10, Math.max(0.5, Number(url.searchParams.get('radius_km') ?? 3)));
	return json({ count: incidents.recipientsFor(incident, radius).length, radiusKm: radius });
};
