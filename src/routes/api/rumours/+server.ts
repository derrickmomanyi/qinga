import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { rumours } from '#lib/server/rumours/rumours.service.ts';
import { uploads } from '#lib/server/uploads/uploads.service.ts';
import { readBody, respond } from '#lib/server/shared/http.ts';
import { file, text, ValidationError } from '#lib/server/shared/validation.ts';

export const GET: RequestHandler = () => json({ rumours: rumours.publicList() });

// "Is this true?" — someone pastes a message or adds a screenshot.
export const POST: RequestHandler = async ({ request }) =>
	respond(async () => {
		const body = await readBody(request);
		const media = file(body, 'media');
		const saved = media ? await uploads.save(media) : null;
		const message = text(body, 'text', { max: 1000 }) ?? (saved ? 'Screenshot shared' : null);
		if (!message) throw new ValidationError('Paste the message or add a screenshot', 'text');
		return { id: rumours.submit(message, saved?.path ?? null, 'app') };
	}, 201);
