import type { RequestHandler } from './$types';
import { forecasts } from '#lib/server/forecasts/forecasts.service.ts';
import { requireUser, respond } from '#lib/server/shared/http.ts';

export const POST: RequestHandler = async ({ params, locals }) => {
	const user = requireUser(locals);
	return respond(() => forecasts.dismiss(Number(params.id), user));
};
