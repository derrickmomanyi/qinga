import { areas } from '../areas/areas.selectors';
import { incidents } from '../incidents/incidents.service';
import { messaging, type Channel } from '../messaging/messaging.service';
import { templates } from '../messaging/templates';
import { rumours } from '../rumours/rumours.service';
import { subscribers } from '../subscribers/subscribers.service';
import type { IncidentType } from '../../constants';

const KEYWORDS: Record<string, IncidentType> = {
	fire: 'fire',
	moto: 'fire',
	accident: 'accident',
	ajali: 'accident',
	disaster: 'disaster',
	flood: 'disaster',
	floods: 'disaster',
	mafuriko: 'disaster',
	landslide: 'disaster'
};

type WhatsAppMessage = { from: string; text: string; lat?: number | null; lon?: number | null; mediaPath?: string | null; mediaType?: string | null };

/**
 * Commands people send to the shortcode or WhatsApp number:
 *   ACCIDENT/FIRE/DISASTER <where>   report an incident
 *   JOIN <area>                      subscribe to alerts      STOP   unsubscribe
 *   CHECK <message>                  ask if a rumour is true
 */
class InboundService {
	async handle(phone: string, body: string, channel: Channel, extra: Omit<WhatsAppMessage, 'from' | 'text'> = {}): Promise<string> {
		messaging.recordInbound(phone, body, channel);
		const reply = await this.route(phone, body.trim(), channel, extra);
		// Reports are acknowledged by the incidents service itself.
		if (reply) await messaging.send([phone], reply, { channel });
		return reply ?? 'report-acknowledged';
	}

	private async route(phone: string, body: string, channel: Channel, extra: Omit<WhatsAppMessage, 'from' | 'text'>): Promise<string | null> {
		const [first = '', ...rest] = body.split(/\s+/);
		const word = first.toLowerCase().replace(/[^a-z]/g, '');
		const remainder = rest.join(' ');

		if (word === 'join' || word === 'jiunge') {
			const area = areas.findInText(remainder);
			if (!area) return templates.joinUnknownArea('MATHARE');
			subscribers.subscribe(phone, area.id, /kiswahili|swahili/i.test(remainder) ? 'sw' : 'en', 'sms');
			return templates.joinOk(area.name);
		}

		if (word === 'stop' || word === 'acha') {
			subscribers.unsubscribe(phone);
			return templates.stopOk();
		}

		if (word === 'check' || word === 'ukweli') {
			rumours.submit(remainder || body, extra.mediaPath ?? null, channel);
			return templates.rumourAck();
		}

		const type = KEYWORDS[word];
		const hasLocation = extra.lat != null && extra.lon != null;
		if (type || hasLocation || extra.mediaPath) {
			const area = areas.findInText(remainder || body);
			await incidents.intake({
				type: type ?? 'unknown',
				subtype: null,
				severity: null,
				casualties: null,
				note: body,
				lat: extra.lat ?? null,
				lon: extra.lon ?? null,
				areaId: hasLocation ? null : (area?.id ?? null),
				locationLabel: hasLocation ? null : area ? area.name : null,
				phone,
				anonymous: false,
				channel,
				mediaPath: extra.mediaPath ?? null,
				mediaType: extra.mediaType ?? null
			});
			return null;
		}

		return templates.help();
	}
}

export const inbound = new InboundService();
