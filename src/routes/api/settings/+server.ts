import type { RequestHandler } from './$types';
import { forecasts } from '#lib/server/forecasts/forecasts.service.ts';
import { settings } from '#lib/server/settings/settings.service.ts';
import { readBody, requireUser, respond } from '#lib/server/shared/http.ts';
import { number } from '#lib/server/shared/validation.ts';

// Heavy-rain threshold (mm in 3 hours). Re-checks stored forecasts straight away.
export const POST: RequestHandler = async ({ locals, request }) => {
	const user = requireUser(locals);
	return respond(async () => {
		const body = await readBody(request);
		const threshold = number(body, 'rain_threshold_mm_3h', { min: 0.1, max: 200 });
		if (threshold != null) settings.set('rain_threshold_mm_3h', String(threshold), user.name);
		forecasts.reevaluate(user.name);
		return { rain_threshold_mm_3h: settings.number('rain_threshold_mm_3h') };
	});
};
