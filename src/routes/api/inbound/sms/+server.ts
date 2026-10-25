import type { RequestHandler } from './$types';
import { inbound } from '#lib/server/inbound/inbound.service.ts';
import { normalizePhone } from '#lib/server/shared/phone.ts';
import { readBody, respond } from '#lib/server/shared/http.ts';
import { text, ValidationError } from '#lib/server/shared/validation.ts';

/**
 * Incoming SMS to the shortcode. Accepts Africa's Talking's callback format
 * (form fields `from`, `text`) and JSON from the demo phone simulator.
 */
export const POST: RequestHandler = async ({ request }) =>
	respond(async () => {
		const body = await readBody(request);
		const phone = normalizePhone(text(body, 'from', { required: true, max: 20 }));
		if (!phone) throw new ValidationError('Unknown phone number format', 'from');
		const message = text(body, 'text', { required: true, max: 640 })!;
		return { reply: await inbound.handle(phone, message, 'sms') };
	});
