// Shared by the browser and the server.

export type IncidentType = 'disaster' | 'accident' | 'fire' | 'unknown';

export const TYPES: Record<
	IncidentType,
	{ label: string; short: string; keyword: string; color: string; tint: string; ink: string; subtypes: string[] }
> = {
	disaster: {
		label: 'Natural disaster',
		short: 'Disaster',
		keyword: 'DISASTER',
		color: '#2563EB',
		tint: '#DBEAFE',
		ink: '#1D4ED8',
		subtypes: ['Flood', 'Heavy rain', 'Landslide', 'Strong winds', 'Other']
	},
	accident: {
		label: 'Accident',
		short: 'Accident',
		keyword: 'ACCIDENT',
		color: '#F59E0B',
		tint: '#FEF3C7',
		ink: '#92400E',
		subtypes: ['Vehicles crashed', 'Hit a person', 'Boda boda', 'Overturned', 'Other']
	},
	fire: {
		label: 'Fire',
		short: 'Fire',
		keyword: 'FIRE',
		color: '#B91C1C',
		tint: '#FEE2E2',
		ink: '#B91C1C',
		subtypes: ['Building', 'Market', 'Vehicle', 'Bush or grass', 'Other']
	},
	unknown: {
		label: 'Quick report',
		short: 'Quick report',
		keyword: '',
		color: '#545C68',
		tint: '#E5E7EB',
		ink: '#3B424D',
		subtypes: []
	}
};

export const REPORT_TYPES: IncidentType[] = ['disaster', 'accident', 'fire'];
export const SEVERITIES = ['Minor', 'Serious', 'Critical'];
export const CASUALTIES = ['Not sure', 'None', '1–2', '3–5', '6+'];

export type Contact = { label: string; number: string; tel: string; primary?: boolean };

const EMERGENCY: Contact = { label: 'Emergency', number: '999 / 112', tel: '999' };
const RED_CROSS: Contact = { label: 'Red Cross ambulance', number: '1199', tel: '1199' };
// Nairobi County fire headquarters, from nairobi.go.ke/emergency-services
const FIRE_BRIGADE: Contact = { label: 'Nairobi Fire Brigade', number: '020 222 2181', tel: '+254202222181' };

export const CONTACTS: Record<IncidentType, Contact[]> = {
	fire: [{ ...FIRE_BRIGADE, primary: true }, EMERGENCY, RED_CROSS],
	accident: [{ ...EMERGENCY, primary: true }, RED_CROSS],
	disaster: [{ ...RED_CROSS, primary: true }, EMERGENCY],
	unknown: [{ ...EMERGENCY, primary: true }, RED_CROSS]
};

// Real shortcode and WhatsApp number are not chosen yet.
export const SHORTCODE_LABEL = 'Qinga SMS (shortcode TBC)';
export const WHATSAPP_LABEL = 'Qinga WhatsApp (number TBC)';

export const NAIROBI = { lat: -1.2864, lon: 36.8172 };

export function typeOf(value: string | null | undefined): IncidentType {
	return value && value in TYPES ? (value as IncidentType) : 'unknown';
}

export function timeAgo(iso: string, now = Date.now()): string {
	const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
	if (mins < 1) return 'just now';
	if (mins < 60) return `${mins} min ago`;
	const hrs = Math.round(mins / 60);
	if (hrs < 24) return `${hrs} h ago`;
	return `${Math.round(hrs / 24)} d ago`;
}

export function clock(iso: string | null | undefined): string {
	if (!iso) return '—';
	return new Date(iso)
		.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Africa/Nairobi' })
		.replace('AM', 'am')
		.replace('PM', 'pm');
}

export function dayClock(iso: string | null | undefined): string {
	if (!iso) return '—';
	const day = new Date(iso).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Africa/Nairobi' });
	return `${day} ${clock(iso)}`;
}
