import { TYPES, type IncidentType } from '../../constants';

// Default SMS wording. The team can edit any message before it is sent.
export const templates = {
	incidentAlert(type: IncidentType, location: string, summary: string | null) {
		const help =
			type === 'fire'
				? 'Fire brigade: 020 2222181. Emergency: 999.'
				: type === 'disaster'
					? 'Help: Red Cross 1199.'
					: 'Emergency: 999. Red Cross: 1199.';
		const what = type === 'unknown' ? 'Incident' : TYPES[type].label;
		const en = `QINGA (verified): ${what} at ${location}. ${summary ?? 'Keep clear of the area.'} ${help}`;
		const swWhat = { fire: 'Moto', accident: 'Ajali', disaster: 'Maafa', unknown: 'Tukio' }[type];
		const swHelp =
			type === 'fire' ? 'Zimamoto: 020 2222181. Dharura: 999.' : type === 'disaster' ? 'Msaada: Red Cross 1199.' : 'Dharura: 999. Red Cross: 1199.';
		const sw = `QINGA (imethibitishwa): ${swWhat} eneo la ${location}. Kaa mbali na eneo hilo. ${swHelp}`;
		return { en, sw };
	},

	update(location: string, text: string) {
		return { en: `QINGA UPDATE: ${location}. ${text}`, sw: `QINGA HABARI MPYA: ${location}. ${text}` };
	},

	allClear(title: string) {
		return { en: `QINGA ALL CLEAR: ${title} is over. Thank you for staying safe.`, sw: `QINGA: Tukio la ${title} limeisha. Asante.` };
	},

	forecastWarning(zone: string, when: string) {
		return {
			en: `QINGA WARNING: Heavy rain expected in ${zone} ${when}. Keep away from rivers and flooded roads. Help: Red Cross 1199.`,
			sw: `QINGA TAHADHARI: Mvua kubwa inatarajiwa ${zone} ${when}. Kaa mbali na mito. Msaada: Red Cross 1199.`
		};
	},

	reporterAck(ref: string, type: IncidentType) {
		const call = type === 'fire' ? 'Fire? Call 020 2222181 or 999.' : 'In danger? Call 999 or 112.';
		return `Qinga: Thanks. Our team is checking this with Red Cross. Ref ${ref}. ${call}`;
	},

	joinOk: (area: string) => `Qinga: You'll get verified alerts for ${area}. Reply STOP to stop.`,
	joinUnknownArea: (examples: string) => `Qinga: Which area? Reply JOIN and your area, e.g. JOIN ${examples}.`,
	stopOk: () => `Qinga: You won't get alerts any more. Reply JOIN and your area to start again.`,
	rumourAck: () => `Qinga: Thanks. We're checking this with Red Cross and will reply when we know.`,
	help: () =>
		`Qinga: To report, send ACCIDENT, FIRE or DISASTER and where. For alerts send JOIN and your area. In danger? Call 999.`
};
