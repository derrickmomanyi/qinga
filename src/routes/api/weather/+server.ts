import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { openMeteo } from '#lib/server/providers/weather/open-meteo.client.ts';
import { NAIROBI } from '#lib/constants.ts';

// Live current weather for a point (defaults to Nairobi CBD), cached 10 minutes.
export const GET: RequestHandler = async ({ url }) => {
	const lat = Number(url.searchParams.get('lat') ?? NAIROBI.lat);
	const lon = Number(url.searchParams.get('lon') ?? NAIROBI.lon);
	if (!Number.isFinite(lat) || !Number.isFinite(lon)) error(400, 'Invalid lat/lon');
	try {
		return json(await openMeteo.current({ lat, lon }));
	} catch (err) {
		error(502, `Weather service unavailable: ${String(err)}`);
	}
};
