export type SendStatus = 'sent' | 'failed';

export type SendResult = { phone: string; status: SendStatus; providerId: string | null; error?: string };

export type DeliveryCallback = (providerId: string, status: 'delivered' | 'failed') => void;

/**
 * An SMS gateway. The messaging service only talks to this interface, so the
 * prototype's simulated gateway and Africa's Talking are interchangeable.
 */
export abstract class SmsProvider {
	abstract readonly name: string;

	/** Sends one message to many numbers (E.164, +254...). */
	abstract send(phones: string[], message: string): Promise<SendResult[]>;

	/**
	 * Gateways that push delivery reports to a webhook don't need this.
	 * The simulated gateway uses it to report deliveries a moment later.
	 */
	watchDeliveries(_results: SendResult[], _onDelivery: DeliveryCallback): void {}

	protected chunk<T>(items: T[], size: number): T[][] {
		const out: T[][] = [];
		for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
		return out;
	}
}
