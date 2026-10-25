// Live forecasts from Open-Meteo (no key needed for non-commercial use).
// https://open-meteo.com/en/docs

export const MODELS = ['ecmwf_ifs025', 'icon_seamless', 'gfs_seamless'] as const;
export type Model = (typeof MODELS)[number];

export const MODEL_LABELS: Record<Model, string> = {
	ecmwf_ifs025: 'ECMWF',
	icon_seamless: 'ICON',
	gfs_seamless: 'GFS'
};

export type HourlyRain = { time: string[]; series: Record<Model, (number | null)[]> };

type Point = { lat: number; lon: number };

class OpenMeteoClient {
	private readonly base = process.env.OPEN_METEO_URL || 'https://api.open-meteo.com/v1/forecast';
	private cache = new Map<string, { at: number; data: unknown }>();

	/** Hourly rain for the next 48 h at several points, from three weather models. */
	async hourlyRain(points: Point[]): Promise<HourlyRain[]> {
		const url = new URL(this.base);
		url.searchParams.set('latitude', points.map((p) => p.lat).join(','));
		url.searchParams.set('longitude', points.map((p) => p.lon).join(','));
		url.searchParams.set('hourly', 'precipitation');
		url.searchParams.set('models', MODELS.join(','));
		url.searchParams.set('forecast_days', '2');
		url.searchParams.set('timezone', 'Africa/Nairobi');
		const json = await this.fetchJson(url);
		const list = (Array.isArray(json) ? json : [json]) as { hourly: Record<string, (number | null)[]> & { time: string[] } }[];
		return list.map((loc) => ({
			time: loc.hourly.time,
			series: Object.fromEntries(MODELS.map((m) => [m, loc.hourly[`precipitation_${m}`] ?? []])) as HourlyRain['series']
		}));
	}

	/** Current conditions plus today's rain at one point, cached for 10 minutes. */
	async current(point: Point) {
		const key = `${point.lat.toFixed(3)},${point.lon.toFixed(3)}`;
		const hit = this.cache.get(key);
		if (hit && Date.now() - hit.at < 600_000) return hit.data;
		const url = new URL(this.base);
		url.searchParams.set('latitude', String(point.lat));
		url.searchParams.set('longitude', String(point.lon));
		url.searchParams.set('current', 'temperature_2m,precipitation,weather_code');
		url.searchParams.set('daily', 'precipitation_sum,precipitation_probability_max');
		url.searchParams.set('forecast_days', '2');
		url.searchParams.set('timezone', 'Africa/Nairobi');
		const data = await this.fetchJson(url);
		this.cache.set(key, { at: Date.now(), data });
		return data;
	}

	private async fetchJson(url: URL): Promise<unknown> {
		const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
		if (!res.ok) throw new Error(`Open-Meteo ${res.status}: ${await res.text()}`);
		return res.json();
	}
}

export const openMeteo = new OpenMeteoClient();
