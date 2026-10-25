import type { RequestHandler } from './$types';
import { incidents } from '#lib/server/incidents/incidents.service.ts';
import { readBody, requireUser, respond } from '#lib/server/shared/http.ts';
import { bool } from '#lib/server/shared/validation.ts';

export const POST: RequestHandler = async ({ params, locals, request }) => {
	const user = requireUser(locals);
	return respond(async () => incidents.close(Number(params.id), user, bool(await readBody(request), 'all_clear')));
};
