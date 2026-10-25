// Small display helpers shared by the team desk screens.

export const CHANNEL_LABELS: Record<string, string> = {
	app: 'App',
	quick: 'Quick report',
	sms: 'SMS',
	whatsapp: 'WhatsApp'
};

export function channelList(csv: string | null | undefined): string {
	return (csv ?? '')
		.split(',')
		.filter(Boolean)
		.map((c) => CHANNEL_LABELS[c] ?? c)
		.join(', ');
}

export function plural(n: number, one: string, many = `${one}s`): string {
	return `${n.toLocaleString('en-KE')} ${n === 1 ? one : many}`;
}

export const ALERT_KINDS: Record<string, string> = {
	alert: 'Public SMS',
	update: 'Update SMS',
	all_clear: 'All-clear SMS',
	warning: 'Warning SMS'
};

/** Open-Meteo times are local Nairobi time ("2026-10-25T15:00"). */
export function hourLabel(local: string): string {
	const h = Number(local.slice(11, 13));
	const suffix = h < 12 ? 'am' : 'pm';
	return `${h % 12 === 0 ? 12 : h % 12}${suffix}`;
}

export function dayLabel(local: string, now = new Date()): string {
	const today = now.toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
	const tomorrow = new Date(now.getTime() + 86_400_000).toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
	const date = local.slice(0, 10);
	if (date === today) return 'today';
	if (date === tomorrow) return 'tomorrow';
	return new Date(`${date}T12:00:00+03:00`).toLocaleDateString('en-KE', { weekday: 'long', timeZone: 'Africa/Nairobi' });
}

export function windowLabel(start: string, end: string): string {
	return `${hourLabel(start)}–${hourLabel(end)} ${dayLabel(start)}`;
}
