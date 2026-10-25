import type { RequestHandler } from './$types';
import { forecasts } from '#lib/server/forecasts/forecasts.service.ts';
import { readBody, requireUser, respond } from '#lib/server/shared/http.ts';
import { bool, text } from '#lib/server/shared/validation.ts';

export const POST: RequestHandler = async ({ params, locals, request }) => {
	const user = requireUser(locals);
	return respond(async () => {
		const body = await readBody(request);
		return forecasts.approve(Number(params.id), user, {
			body: text(body, 'body', { required: true, max: 480 })!,
			bodySw: text(body, 'body_sw', { max: 480 }),
			notifyRedCross: bool(body, 'notify_red_cross')
		});
	});
};
