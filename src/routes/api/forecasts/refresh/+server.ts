import type { RequestHandler } from './$types';
import { forecasts } from '#lib/server/forecasts/forecasts.service.ts';
import { requireUser, respond } from '#lib/server/shared/http.ts';

// Pulls fresh data from Open-Meteo now instead of waiting for the hourly run.
export const POST: RequestHandler = async ({ locals }) => {
	const user = requireUser(locals);
	return respond(() => forecasts.refresh(user.name));
};
