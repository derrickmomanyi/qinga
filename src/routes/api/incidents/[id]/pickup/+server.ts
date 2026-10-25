import type { RequestHandler } from './$types';
import { incidents } from '#lib/server/incidents/incidents.service.ts';
import { requireUser, respond } from '#lib/server/shared/http.ts';

export const POST: RequestHandler = async ({ params, locals }) => {
	const user = requireUser(locals);
	return respond(() => incidents.markVerifying(Number(params.id), user));
};
