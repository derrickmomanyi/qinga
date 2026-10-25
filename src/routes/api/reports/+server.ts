import type { RequestHandler } from './$types';
import { incidents } from '#lib/server/incidents/incidents.service.ts';
import { parseReportForm } from '#lib/server/reports/reports.validator.ts';
import { uploads } from '#lib/server/uploads/uploads.service.ts';
import { file } from '#lib/server/shared/validation.ts';
import { readBody, respond } from '#lib/server/shared/http.ts';

// Public report from the app (full form or quick report).
export const POST: RequestHandler = async ({ request }) =>
	respond(async () => {
		const form = await readBody(request);
		const input = parseReportForm(form);
		const media = file(form, 'media');
		const saved = media ? await uploads.save(media) : null;
		return incidents.intake({ ...input, mediaPath: saved?.path ?? null, mediaType: saved?.type ?? null });
	}, 201);
