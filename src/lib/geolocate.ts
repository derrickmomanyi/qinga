// Browser geolocation as a promise. Rejects if the person says no, there is no GPS, or it takes too long.

export type Coords = { lat: number; lon: number };

/** Middle of the box around some points, so a map opens on what's happening. */
export function centerOf(points: Coords[], fallback: Coords): Coords {
	if (!points.length) return fallback;
	const lats = points.map((p) => p.lat);
	const lons = points.map((p) => p.lon);
	return { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lon: (Math.min(...lons) + Math.max(...lons)) / 2 };
}

export function geolocate(timeout = 12_000): Promise<Coords> {
	return new Promise((resolve, reject) => {
		if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
			reject(new Error('Location is not available on this device'));
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
			(err) => reject(err),
			{ enableHighAccuracy: true, timeout, maximumAge: 60_000 }
		);
	});
}
