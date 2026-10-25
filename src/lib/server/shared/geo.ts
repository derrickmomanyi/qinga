export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
	const toRad = (d: number) => (d * Math.PI) / 180;
	const dLat = toRad(bLat - aLat);
	const dLon = toRad(bLon - aLon);
	const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
	return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// Rough box around Nairobi and its neighbours; reports outside it are still accepted but flagged.
export function inNairobiRegion(lat: number, lon: number): boolean {
	return lat > -1.6 && lat < -0.9 && lon > 36.5 && lon < 37.2;
}
