import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { areas } from '#lib/server/areas/areas.selectors.ts';

export const GET: RequestHandler = () =>
	json({ areas: areas.list().map(({ id, name, lat, lon, watch }) => ({ id, name, lat, lon, watch: !!watch })) });
