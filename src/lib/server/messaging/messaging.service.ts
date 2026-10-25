import { all, get, insert, nowIso, run, transaction } from '../db/client';
import { audit } from '../audit/audit.service';
import { createSmsProvider, type SmsProvider, type SendResult } from '../providers/sms';

export type Recipient = { phone: string; language: string };
export type Channel = 'sms' | 'whatsapp';

export type StoredMessage = {
	id: number;
	alert_id: number | null;
	direction: 'in' | 'out';
	channel: Channel;
	phone: string;
	body: string;
	status: string;
	provider: string;
	created_at: string;
};

class MessagingService {
	private readonly provider: SmsProvider = createSmsProvider();

	get providerName() {
		return this.provider.name;
	}

	/** Sends each recipient the version in their language and records every message. */
	async sendLocalized(recipients: Recipient[], bodies: { en: string; sw?: string | null }, alertId?: number) {
		const sw = recipients.filter((r) => r.language === 'sw' && bodies.sw);
		const en = recipients.filter((r) => !(r.language === 'sw' && bodies.sw));
		const a = await this.send(en.map((r) => r.phone), bodies.en, { alertId });
		const b = sw.length ? await this.send(sw.map((r) => r.phone), bodies.sw!, { alertId }) : { sent: 0, failed: 0 };
		return { sent: a.sent + b.sent, failed: a.failed + b.failed };
	}

	async send(phones: string[], body: string, opts: { alertId?: number; channel?: Channel } = {}) {
		const unique = [...new Set(phones)];
		if (!unique.length) return { sent: 0, failed: 0 };
		const channel = opts.channel ?? 'sms';

		// WhatsApp replies are simulated in the prototype; SMS goes through the gateway.
		const results: SendResult[] =
			channel === 'whatsapp'
				? unique.map((phone) => ({ phone, status: 'sent', providerId: null }))
				: await this.provider.send(unique, body);
		const providerName = channel === 'whatsapp' ? 'simulated-whatsapp' : this.provider.name;

		const at = nowIso();
		transaction(() => {
			for (const r of results) {
				insert(
					`INSERT INTO sms_messages (alert_id, direction, channel, phone, body, status, provider, provider_id, created_at, updated_at)
					 VALUES (?, 'out', ?, ?, ?, ?, ?, ?, ?, ?)`,
					opts.alertId ?? null,
					channel,
					r.phone,
					body,
					channel === 'whatsapp' ? 'delivered' : r.status,
					providerName,
					r.providerId,
					at,
					at
				);
			}
			if (opts.alertId) this.recount(opts.alertId);
		});

		if (channel === 'sms') this.provider.watchDeliveries(results, (id, status) => this.markDelivery(id, status));
		audit.broadcast({ entity: 'sms', entityId: opts.alertId ?? null, action: 'sent' });
		const failed = results.filter((r) => r.status === 'failed').length;
		return { sent: results.length - failed, failed };
	}

	/** Delivery report from the gateway (simulated callback or Africa's Talking webhook). */
	markDelivery(providerId: string, status: 'delivered' | 'failed') {
		const row = get<{ id: number; alert_id: number | null }>(
			'SELECT id, alert_id FROM sms_messages WHERE provider_id = ?',
			providerId
		);
		if (!row) return false;
		run('UPDATE sms_messages SET status = ?, updated_at = ? WHERE id = ?', status, nowIso(), row.id);
		if (row.alert_id) this.recount(row.alert_id);
		audit.broadcast({ entity: 'sms', entityId: row.alert_id, action: status });
		return true;
	}

	recordInbound(phone: string, body: string, channel: Channel) {
		const at = nowIso();
		insert(
			`INSERT INTO sms_messages (direction, channel, phone, body, status, provider, created_at, updated_at)
			 VALUES ('in', ?, ?, ?, 'received', 'inbound', ?, ?)`,
			channel,
			phone,
			body,
			at,
			at
		);
	}

	conversation(phone: string): StoredMessage[] {
		return all<StoredMessage>('SELECT * FROM sms_messages WHERE phone = ? ORDER BY created_at, id LIMIT 200', phone);
	}

	private recount(alertId: number) {
		run(
			`UPDATE alerts SET
				recipients = (SELECT COUNT(*) FROM sms_messages WHERE alert_id = ?),
				delivered = (SELECT COUNT(*) FROM sms_messages WHERE alert_id = ? AND status = 'delivered'),
				failed = (SELECT COUNT(*) FROM sms_messages WHERE alert_id = ? AND status = 'failed')
			 WHERE id = ?`,
			alertId,
			alertId,
			alertId,
			alertId
		);
	}
}

export const messaging = new MessagingService();
