// Display helpers for the public pages (browser and server).

const TZ = 'Africa/Nairobi';
const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ });

function hour12(local: string) {
	const h = Number(local.slice(11, 13));
	return { n: h % 12 || 12, ap: h < 12 ? 'am' : 'pm' };
}

/**
 * Forecast windows are stored as Nairobi local time without an offset ("2026-10-25T15:00", from Open-Meteo).
 * Returns e.g. "Today 3–6 pm", "Tomorrow 9 am–12 pm" or "Monday 3–6 pm".
 */
export function forecastWindow(start: string, end: string, now = new Date()): string {
	const date = start.slice(0, 10);
	const day =
		date === dayKey(now)
			? 'Today'
			: date === dayKey(new Date(now.getTime() + 86_400_000))
				? 'Tomorrow'
				: new Date(`${date}T12:00:00+03:00`).toLocaleDateString('en-GB', { weekday: 'long', timeZone: TZ });
	const a = hour12(start);
	const b = hour12(end);
	const range = a.ap === b.ap ? `${a.n}–${b.n} ${b.ap}` : `${a.n} ${a.ap}–${b.n} ${b.ap}`;
	return `${day} ${range}`;
}

/** Link that opens WhatsApp with a ready-to-send message. */
export function whatsappShare(text: string): string {
	return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Uploaded media is served at /uploads/<media_path>. */
export function mediaUrl(path: string): string {
	return `/uploads/${encodeURIComponent(path)}`;
}

export function isVideo(path: string, type?: string | null): boolean {
	if (type) return type.startsWith('video');
	return /\.(mp4|mov|webm)$/i.test(path);
}
