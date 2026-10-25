import type { RequestHandler } from './$types';
import { messaging } from '#lib/server/messaging/messaging.service.ts';
import { readBody, respond } from '#lib/server/shared/http.ts';
import { text } from '#lib/server/shared/validation.ts';

// Africa's Talking delivery report callback (fields `id`, `status`).
export const POST: RequestHandler = async ({ request }) =>
	respond(async () => {
		const body = await readBody(request);
		const id = text(body, 'id', { required: true })!;
		const status = text(body, 'status') === 'Success' ? 'delivered' : 'failed';
		return { updated: messaging.markDelivery(id, status) };
	});
