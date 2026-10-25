import type { PageServerLoad } from './$types';
import { forecasts } from '#lib/server/forecasts/forecasts.service.ts';
import { settings } from '#lib/server/settings/settings.service.ts';
import { MODEL_LABELS } from '#lib/server/providers/weather/open-meteo.client.ts';

export const load: PageServerLoad = async ({ url, parent }) => {
	await parent(); // signed-in check happens in the layout

	const all = forecasts.zones();
	const wanted = Number(url.searchParams.get('zone'));
	const zone = all.find((z) => z.id === wanted) ?? all.find((z) => z.forecast?.status === 'forecast') ?? all[0] ?? null;
	const forecast = zone?.forecast ?? null;

	return {
		zones: all.map((z) => ({
			id: z.id,
			name: z.name,
			status: z.forecast?.status ?? null,
			peak: z.peaks.length ? Math.max(...z.peaks.map((p) => p.peak)) : null
		})),
		zone: zone && {
			id: zone.id,
			name: zone.name,
			fetched_at: zone.fetched_at,
			windows: zone.windows,
			peaks: zone.peaks.map((p) => ({ ...p, label: MODEL_LABELS[p.model] }))
		},
		forecast,
		message: forecast?.status === 'forecast' ? forecasts.defaultMessage(forecast) : null,
		recipients: zone ? forecasts.recipients({ lat: zone.lat, lon: zone.lon, area_id: zone.id }).length : 0,
		sent: forecast ? forecasts.alerts(forecast.id) : [],
		threshold: settings.number('rain_threshold_mm_3h'),
		modelsNeeded: settings.number('models_needed'),
		engine: forecasts.status
	};
};
