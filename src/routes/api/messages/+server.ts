import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { messaging } from '#lib/server/messaging/messaging.service.ts';
import { normalizePhone } from '#lib/server/shared/phone.ts';

// Conversation for one number, used by the demo phone simulator.
export const GET: RequestHandler = ({ url }) => {
	const phone = normalizePhone(url.searchParams.get('phone'));
	if (!phone) error(400, 'phone is required');
	return json({ phone, messages: messaging.conversation(phone) });
};
