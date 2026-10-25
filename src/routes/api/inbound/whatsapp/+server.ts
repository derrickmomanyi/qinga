import type { RequestHandler } from './$types';
import { inbound } from '#lib/server/inbound/inbound.service.ts';
import { uploads } from '#lib/server/uploads/uploads.service.ts';
import { normalizePhone } from '#lib/server/shared/phone.ts';
import { readBody, respond } from '#lib/server/shared/http.ts';
import { file, number, text, ValidationError } from '#lib/server/shared/validation.ts';

// Incoming WhatsApp message (text, shared location, photo). Simulated in the prototype.
export const POST: RequestHandler = async ({ request }) =>
	respond(async () => {
		const body = await readBody(request);
		const phone = normalizePhone(text(body, 'from', { required: true, max: 20 }));
		if (!phone) throw new ValidationError('Unknown phone number format', 'from');
		const media = file(body, 'media');
		const saved = media ? await uploads.save(media) : null;
		const lat = number(body, 'lat', { min: -5, max: 5 });
		const lon = number(body, 'lon', { min: 33, max: 42 });
		const message = text(body, 'text', { max: 1000 }) ?? (lat != null ? 'Location shared' : saved ? 'Photo' : null);
		if (!message) throw new ValidationError('Type a message, share a location or add a photo', 'text');
		const reply = await inbound.handle(phone, message, 'whatsapp', {
			lat,
			lon,
			mediaPath: saved?.path ?? null,
			mediaType: saved?.type ?? null
		});
		return { reply };
	});
