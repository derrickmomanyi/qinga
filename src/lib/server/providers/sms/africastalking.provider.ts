import { SmsProvider, type SendResult } from './sms.provider';

type AtRecipient = { number: string; status: string; messageId: string; statusCode: number };

/**
 * Africa's Talking bulk SMS. Use username "sandbox" with a sandbox API key to
 * test without sending real messages. Delivery reports arrive at /api/sms/delivery.
 */
export class AfricasTalkingSmsProvider extends SmsProvider {
	readonly name = 'africastalking';

	constructor(
		private readonly username: string,
		private readonly apiKey: string,
		private readonly senderId?: string
	) {
		super();
	}

	private get endpoint() {
		return this.username === 'sandbox'
			? 'https://api.sandbox.africastalking.com/version1/messaging'
			: 'https://api.africastalking.com/version1/messaging';
	}

	async send(phones: string[], message: string): Promise<SendResult[]> {
		const results: SendResult[] = [];
		for (const batch of this.chunk(phones, 100)) {
			const body = new URLSearchParams({ username: this.username, to: batch.join(','), message });
			if (this.senderId) body.set('from', this.senderId);
			try {
				const res = await fetch(this.endpoint, {
					method: 'POST',
					headers: { apiKey: this.apiKey, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
					body,
					signal: AbortSignal.timeout(15_000)
				});
				const data = (await res.json()) as { SMSMessageData?: { Recipients?: AtRecipient[] } };
				const recipients = data.SMSMessageData?.Recipients ?? [];
				for (const phone of batch) {
					const r = recipients.find((x) => x.number === phone);
					results.push(
						r && r.status === 'Success'
							? { phone, status: 'sent', providerId: r.messageId }
							: { phone, status: 'failed', providerId: r?.messageId ?? null, error: r?.status ?? `HTTP ${res.status}` }
					);
				}
			} catch (err) {
				for (const phone of batch) results.push({ phone, status: 'failed', providerId: null, error: String(err) });
			}
		}
		return results;
	}
}
