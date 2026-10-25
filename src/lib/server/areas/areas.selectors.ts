import { all, get } from '../db/client';
import { distanceKm } from '../shared/geo';

export type Area = { id: number; name: string; lat: number; lon: number; watch: number };

// Approximate centre points of Nairobi areas used for alert targeting (dummy data for the prototype).
export const AREA_SEED: Omit<Area, 'id'>[] = [
	{ name: 'CBD', lat: -1.2864, lon: 36.8172, watch: 0 },
	{ name: 'Gikomba', lat: -1.2834, lon: 36.837, watch: 0 },
	{ name: 'Eastleigh', lat: -1.274, lon: 36.851, watch: 0 },
	{ name: 'Mathare', lat: -1.26, lon: 36.859, watch: 1 },
	{ name: 'Mukuru kwa Njenga', lat: -1.311, lon: 36.879, watch: 1 },
	{ name: 'Kibera', lat: -1.3133, lon: 36.7869, watch: 1 },
	{ name: 'South C', lat: -1.319, lon: 36.827, watch: 1 },
	{ name: 'Kasarani', lat: -1.221, lon: 36.897, watch: 1 },
	{ name: 'Roysambu', lat: -1.219, lon: 36.887, watch: 1 },
	{ name: 'Githurai', lat: -1.202, lon: 36.913, watch: 1 },
	{ name: 'Kayole', lat: -1.278, lon: 36.915, watch: 1 },
	{ name: 'Pipeline, Embakasi', lat: -1.322, lon: 36.899, watch: 0 },
	{ name: 'Mombasa Rd, Cabanas', lat: -1.329, lon: 36.888, watch: 0 },
	{ name: 'Westlands', lat: -1.2676, lon: 36.8108, watch: 0 },
	{ name: 'Kileleshwa', lat: -1.281, lon: 36.784, watch: 0 },
	{ name: 'Kawangware', lat: -1.286, lon: 36.748, watch: 0 },
	{ name: "Lang'ata", lat: -1.348, lon: 36.747, watch: 0 }
];

export const areas = {
	list: () => all<Area>('SELECT * FROM areas ORDER BY name'),
	watchZones: () => all<Area>('SELECT * FROM areas WHERE watch = 1 ORDER BY name'),
	byId: (id: number) => get<Area>('SELECT * FROM areas WHERE id = ?', id),

	nearest(lat: number, lon: number): Area {
		const list = areas.list();
		return list.reduce((best, a) =>
			distanceKm(lat, lon, a.lat, a.lon) < distanceKm(lat, lon, best.lat, best.lon) ? a : best
		);
	},

	// Finds an area mentioned in free text such as an SMS ("FIRE near Gikomba market").
	findInText(text: string): Area | undefined {
		const haystack = text.toLowerCase();
		const list = areas.list().sort((a, b) => b.name.length - a.name.length);
		return list.find((a) => {
			const first = a.name.toLowerCase().split(/[ ,]/)[0];
			return haystack.includes(a.name.toLowerCase()) || (first.length > 3 && haystack.includes(first));
		});
	}
};
