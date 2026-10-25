// Street-level place names from OpenStreetMap's Nominatim (low volume, identified user agent).
// https://operations.osmfoundation.org/policies/nominatim/

type NominatimAddress = Partial<Record<'road' | 'suburb' | 'neighbourhood' | 'city_district' | 'city' | 'town', string>>;

class NominatimClient {
	private readonly base = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org';
	private cache = new Map<string, string | null>();

	async placeName(lat: number, lon: number): Promise<string | null> {
		const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
		if (this.cache.has(key)) return this.cache.get(key) ?? null;
		try {
			const url = new URL('/reverse', this.base);
			url.searchParams.set('format', 'jsonv2');
			url.searchParams.set('lat', String(lat));
			url.searchParams.set('lon', String(lon));
			url.searchParams.set('zoom', '17');
			const res = await fetch(url, {
				headers: { 'User-Agent': 'Qinga-prototype/0.1 (https://github.com/derrickmomanyi/qinga)' },
				signal: AbortSignal.timeout(4000)
			});
			if (!res.ok) throw new Error(String(res.status));
			const data = (await res.json()) as { address?: NominatimAddress };
			const a = data.address ?? {};
			const parts = [a.road, a.suburb ?? a.neighbourhood ?? a.city_district].filter(Boolean);
			const name = parts.length ? parts.join(', ') : null;
			this.cache.set(key, name);
			return name;
		} catch {
			return null;
		}
	}
}

export const nominatim = new NominatimClient();
