import type { RequestHandler } from './$types';
import { areas } from '#lib/server/areas/areas.selectors.ts';
import { messaging } from '#lib/server/messaging/messaging.service.ts';
import { templates } from '#lib/server/messaging/templates.ts';
import { subscribers } from '#lib/server/subscribers/subscribers.service.ts';
import { normalizePhone } from '#lib/server/shared/phone.ts';
import { readBody, respond } from '#lib/server/shared/http.ts';
import { number, oneOf, text, ValidationError } from '#lib/server/shared/validation.ts';

// Web sign-up for SMS alerts; sends the same confirmation SMS as "JOIN <area>".
export const POST: RequestHandler = async ({ request }) =>
	respond(async () => {
		const body = await readBody(request);
		const phone = normalizePhone(text(body, 'phone', { required: true, max: 20 }));
		if (!phone) throw new ValidationError('Enter a Kenyan mobile number like 0712 345 678', 'phone');
		const area = areas.byId(number(body, 'area_id', { min: 1 }) ?? 0);
		if (!area) throw new ValidationError('Choose your area', 'area_id');
		const language = oneOf(body, 'language', ['en', 'sw'] as const, 'en')!;
		subscribers.subscribe(phone, area.id, language, 'web');
		await messaging.send([phone], templates.joinOk(area.name));
		return { ok: true, area: area.name };
	}, 201);
