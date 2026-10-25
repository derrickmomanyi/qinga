import { randomBytes } from 'node:crypto';
import { SmsProvider, type DeliveryCallback, type SendResult } from './sms.provider';

/**
 * Stands in for a real gateway: accepts every message, then reports ~97% as
 * delivered and the rest as failed (stable per number), like a real network would.
 */
export class SimulatedSmsProvider extends SmsProvider {
	readonly name = 'simulated';

	async send(phones: string[], _message: string): Promise<SendResult[]> {
		return phones.map((phone) => ({ phone, status: 'sent', providerId: `sim-${randomBytes(6).toString('hex')}` }));
	}

	watchDeliveries(results: SendResult[], onDelivery: DeliveryCallback): void {
		setTimeout(() => {
			for (const r of results) {
				if (!r.providerId) continue;
				onDelivery(r.providerId, this.willFail(r.phone) ? 'failed' : 'delivered');
			}
		}, 1500);
	}

	private willFail(phone: string): boolean {
		let h = 0;
		for (const ch of phone) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
		return h % 100 < 3;
	}
}
