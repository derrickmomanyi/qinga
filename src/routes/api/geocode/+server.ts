import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { areas } from '#lib/server/areas/areas.selectors.ts';
import { nominatim } from '#lib/server/providers/geocoding/nominatim.client.ts';

// Place name for the reporter's GPS position (OpenStreetMap), plus the nearest Qinga area.
export const GET: RequestHandler = async ({ url }) => {
	const lat = Number(url.searchParams.get('lat'));
	const lon = Number(url.searchParams.get('lon'));
	if (!Number.isFinite(lat) || !Number.isFinite(lon)) error(400, 'lat and lon are required');
	const area = areas.nearest(lat, lon);
	const name = (await nominatim.placeName(lat, lon)) ?? area.name;
	return json({ name, areaId: area.id, areaName: area.name });
};
