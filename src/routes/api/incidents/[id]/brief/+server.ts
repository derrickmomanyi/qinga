import type { RequestHandler } from './$types';
import { briefs } from '#lib/server/briefs/briefs.service.ts';
import { incidentSelectors } from '#lib/server/incidents/incidents.selectors.ts';
import { requireUser, respond } from '#lib/server/shared/http.ts';
import { ValidationError } from '#lib/server/shared/validation.ts';

// Sends the full-detail brief link to Red Cross.
export const POST: RequestHandler = async ({ params, locals, url }) => {
	const user = requireUser(locals);
	return respond(() => {
		const id = Number(params.id);
		if (!incidentSelectors.byId(id)) throw new ValidationError('Incident not found');
		const brief = briefs.send({ incidentId: id }, user);
		return { token: brief.token, url: `${url.origin}/brief/${brief.token}`, sentTo: brief.sent_to };
	});
};
