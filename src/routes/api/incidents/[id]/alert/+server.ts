import type { RequestHandler } from './$types';
import { incidents } from '#lib/server/incidents/incidents.service.ts';
import { readBody, requireUser, respond } from '#lib/server/shared/http.ts';
import { number, text } from '#lib/server/shared/validation.ts';

export const POST: RequestHandler = async ({ params, locals, request }) => {
	const user = requireUser(locals);
	return respond(async () => {
		const body = await readBody(request);
		return incidents.sendAlert(Number(params.id), user, {
			body: text(body, 'body', { required: true, max: 480 })!,
			bodySw: text(body, 'body_sw', { max: 480 }),
			radiusKm: number(body, 'radius_km', { min: 0.5, max: 10 }) ?? 3
		});
	});
};
