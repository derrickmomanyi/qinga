import { all, get, insert, nowIso, run, transaction } from '../db/client';
import { audit } from '../audit/audit.service';
import { areas, type Area } from '../areas/areas.selectors';
import { briefs } from '../briefs/briefs.service';
import { messaging } from '../messaging/messaging.service';
import { templates } from '../messaging/templates';
import { settings } from '../settings/settings.service';
import { subscribers } from '../subscribers/subscribers.service';
import { MODELS, openMeteo, type HourlyRain, type Model } from '../providers/weather/open-meteo.client';
import { ValidationError } from '../shared/validation';

type Actor = { id: number; name: string };

export type ModelPeak = { model: Model; peak: number; start: string; end: string };

export type ForecastRow = {
	id: number;
	area_id: number;
	area_name: string;
	lat: number;
	lon: number;
	window_start: string;
	window_end: string;
	peak_mm: number;
	agree: number;
	models: string;
	status: 'forecast' | 'approved' | 'dismissed' | 'expired';
	approved_at: string | null;
	created_at: string;
	updated_at: string;
};

export type ZoneSummary = Area & {
	fetched_at: string | null;
	peaks: ModelPeak[];
	windows: { start: string; mm: number }[];
	forecast: ForecastRow | null;
	threshold: number;
};

/** Heavy-rain warnings go to subscribers in the zone or within this distance of its centre. */
export const WARNING_RADIUS_KM = 2.5;

// Open-Meteo times are local Nairobi time without an offset; forecast windows are stored the same way.
const nairobiTime = (local: string) => new Date(`${local}:00+03:00`);

/** Current Nairobi time in the same "YYYY-MM-DDTHH:MM" form, for comparing with forecast windows. */
const nairobiNow = () => new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 16);

class ForecastsService {
	private lastError: string | null = null;

	get status() {
		return { lastError: this.lastError, lastFetch: get<{ t: string }>('SELECT MAX(fetched_at) AS t FROM zone_weather')?.t ?? null };
	}

	/** Pulls the next 48 h of rain for every watch zone and opens, updates or expires forecasts. */
	async refresh(actor = 'system') {
		const zones = areas.watchZones();
		try {
			const rain = await openMeteo.hourlyRain(zones);
			this.lastError = null;
			transaction(() => zones.forEach((zone, i) => this.evaluate(zone, rain[i], actor)));
			this.expireOld();
			audit.broadcast({ entity: 'forecast', entityId: null, action: 'refreshed' });
			return { zones: zones.length, fetchedAt: nowIso() };
		} catch (err) {
			this.lastError = String(err);
			throw err;
		}
	}

	/** Re-checks stored weather against a new threshold without calling the API again. */
	reevaluate(actor: string) {
		transaction(() => {
			for (const zone of areas.watchZones()) {
				const row = get<{ data: string }>('SELECT data FROM zone_weather WHERE area_id = ?', zone.id);
				if (row) this.evaluate(zone, JSON.parse(row.data) as HourlyRain, actor, false);
			}
		});
		audit.broadcast({ entity: 'forecast', entityId: null, action: 'reevaluated' });
	}

	list(): ForecastRow[] {
		return all<ForecastRow>(
			`SELECT f.*, a.name AS area_name, a.lat, a.lon FROM forecasts f JOIN areas a ON a.id = f.area_id
			 WHERE f.status IN ('forecast', 'approved') AND f.window_end > ? ORDER BY f.window_start`,
			nairobiNow()
		);
	}

	byId(id: number) {
		return get<ForecastRow>(
			'SELECT f.*, a.name AS area_name, a.lat, a.lon FROM forecasts f JOIN areas a ON a.id = f.area_id WHERE f.id = ?',
			id
		);
	}

	zones(): ZoneSummary[] {
		const threshold = settings.number('rain_threshold_mm_3h');
		const active = this.list();
		return areas.watchZones().map((zone) => {
			const row = get<{ data: string; fetched_at: string }>('SELECT data, fetched_at FROM zone_weather WHERE area_id = ?', zone.id);
			const rain = row ? (JSON.parse(row.data) as HourlyRain) : null;
			return {
				...zone,
				fetched_at: row?.fetched_at ?? null,
				peaks: rain ? MODELS.map((m) => this.peak(rain, m)) : [],
				windows: rain ? this.windows(rain, 'ecmwf_ifs025') : [],
				forecast: active.find((f) => f.area_id === zone.id) ?? null,
				threshold
			};
		});
	}

	defaultMessage(f: ForecastRow) {
		const start = nairobiTime(f.window_start.slice(0, 16));
		const end = nairobiTime(f.window_end.slice(0, 16));
		const dayOf = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
		const day = dayOf(start) === dayOf(new Date()) ? 'today' : 'tomorrow';
		const fmt = (d: Date) =>
			d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, timeZone: 'Africa/Nairobi' }).replace(' ', '').toLowerCase();
		return templates.forecastWarning(f.area_name, `${day} ${fmt(start)}-${fmt(end)}`);
	}

	/** People a warning for this forecast would reach. */
	recipients(f: Pick<ForecastRow, 'lat' | 'lon' | 'area_id'>) {
		return subscribers.near(f.lat, f.lon, WARNING_RADIUS_KM, f.area_id);
	}

	/** Warnings already sent for a forecast, with delivery counts. */
	alerts(forecastId: number) {
		return all<{ id: number; created_at: string; recipients: number; delivered: number; failed: number }>(
			`SELECT id, created_at, recipients, delivered, failed FROM alerts WHERE forecast_id = ? ORDER BY created_at DESC`,
			forecastId
		);
	}

	async approve(id: number, user: Actor, input: { body: string; bodySw: string | null; notifyRedCross: boolean }) {
		const f = this.byId(id);
		if (!f) throw new ValidationError('Forecast not found');
		if (f.status !== 'forecast') throw new ValidationError(`This forecast is already ${f.status}`);
		run(`UPDATE forecasts SET status = 'approved', approved_by = ?, approved_at = ?, updated_at = ? WHERE id = ?`, user.id, nowIso(), nowIso(), id);
		const recipients = this.recipients(f);
		const alertId = insert(
			`INSERT INTO alerts (forecast_id, kind, body, body_sw, radius_km, user_id, created_at) VALUES (?, 'warning', ?, ?, ?, ?, ?)`,
			id,
			input.body,
			input.bodySw,
			WARNING_RADIUS_KM,
			user.id,
			nowIso()
		);
		const result = await messaging.sendLocalized(recipients, { en: input.body, sw: input.bodySw }, alertId);
		audit.record('forecast', id, 'approved', user.name, `Warning SMS to ${recipients.length} people in ${f.area_name}`);
		if (input.notifyRedCross) briefs.send({ forecastId: id }, user);
		return { recipients: recipients.length, ...result };
	}

	dismiss(id: number, user: Actor) {
		const f = this.byId(id);
		if (!f) throw new ValidationError('Forecast not found');
		run(`UPDATE forecasts SET status = 'dismissed', dismissed_by = ?, dismissed_at = ?, updated_at = ? WHERE id = ?`, user.id, nowIso(), nowIso(), id);
		audit.record('forecast', id, 'dismissed', user.name);
	}

	private evaluate(zone: Area, rain: HourlyRain, actor: string, store = true) {
		const at = nowIso();
		if (store) {
			run(
				`INSERT INTO zone_weather (area_id, fetched_at, data) VALUES (?, ?, ?)
				 ON CONFLICT(area_id) DO UPDATE SET fetched_at = excluded.fetched_at, data = excluded.data`,
				zone.id,
				at,
				JSON.stringify(rain)
			);
		}
		const threshold = settings.number('rain_threshold_mm_3h');
		const needed = settings.number('models_needed');
		const peaks = MODELS.map((m) => this.peak(rain, m));
		const agreeing = peaks.filter((p) => p.peak >= threshold);
		const current = get<{ id: number; status: string }>(
			`SELECT id, status FROM forecasts WHERE area_id = ? AND status IN ('forecast', 'approved') AND window_end > ? ORDER BY id DESC LIMIT 1`,
			zone.id,
			nairobiNow()
		);

		if (agreeing.length >= needed) {
			const lead = agreeing.sort((a, b) => b.peak - a.peak)[0];
			if (current?.status === 'approved') return; // already warned; keep the approved window
			if (current) {
				run(
					'UPDATE forecasts SET window_start = ?, window_end = ?, peak_mm = ?, agree = ?, models = ?, updated_at = ? WHERE id = ?',
					lead.start,
					lead.end,
					lead.peak,
					agreeing.length,
					JSON.stringify(peaks),
					at,
					current.id
				);
			} else {
				const id = insert(
					`INSERT INTO forecasts (area_id, window_start, window_end, peak_mm, agree, models, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
					zone.id,
					lead.start,
					lead.end,
					lead.peak,
					agreeing.length,
					JSON.stringify(peaks),
					at,
					at
				);
				audit.record('forecast', id, 'created', actor, `${zone.name}: ${lead.peak.toFixed(1)} mm in 3 h, ${agreeing.length}/3 models`);
			}
		} else if (current?.status === 'forecast') {
			run(`UPDATE forecasts SET status = 'expired', updated_at = ? WHERE id = ?`, at, current.id);
			audit.record('forecast', current.id, 'expired', actor, 'Heavy rain no longer forecast');
		}
	}

	private expireOld() {
		run(`UPDATE forecasts SET status = 'expired', updated_at = ? WHERE status IN ('forecast', 'approved') AND window_end <= ?`, nowIso(), nairobiNow());
	}

	/** Wettest 3-hour stretch from now on, for one model. */
	private peak(rain: HourlyRain, model: Model): ModelPeak {
		const windows = this.windows(rain, model);
		const best = windows.reduce((a, b) => (b.mm > a.mm ? b : a), windows[0] ?? { start: rain.time[0], mm: 0 });
		const startIdx = rain.time.indexOf(best.start);
		return { model, peak: Math.round(best.mm * 10) / 10, start: best.start, end: rain.time[startIdx + 3] ?? best.start };
	}

	private windows(rain: HourlyRain, model: Model) {
		const series = rain.series[model] ?? [];
		const nowMs = Date.now() - 3_600_000;
		const out: { start: string; mm: number }[] = [];
		for (let i = 0; i + 3 <= rain.time.length; i += 3) {
			if (nairobiTime(rain.time[i]).getTime() < nowMs) continue;
			const mm = (series[i] ?? 0) + (series[i + 1] ?? 0) + (series[i + 2] ?? 0);
			out.push({ start: rain.time[i], mm: Math.round(mm * 10) / 10 });
		}
		return out;
	}
}

export const forecasts = new ForecastsService();

const store = globalThis as typeof globalThis & { __qingaForecastTimer?: NodeJS.Timeout };

/** Runs once at start-up, then hourly. */
export function startForecastScheduler() {
	if (store.__qingaForecastTimer) return;
	const tick = () => forecasts.refresh().catch((err) => console.error('[forecasts] refresh failed:', err));
	tick();
	store.__qingaForecastTimer = setInterval(tick, 60 * 60_000);
}
