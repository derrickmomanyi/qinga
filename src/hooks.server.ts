import type { Handle } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { auth, SESSION_COOKIE } from '#lib/server/auth/auth.service.ts';
import { seedIfEmpty } from '#lib/server/db/seed.ts';
import { startForecastScheduler } from '#lib/server/forecasts/forecasts.service.ts';

if (!building) {
	seedIfEmpty();
	if (process.env.QINGA_DISABLE_FORECASTS !== '1') startForecastScheduler();
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = auth.userForSession(event.cookies.get(SESSION_COOKIE));
	return resolve(event);
};
