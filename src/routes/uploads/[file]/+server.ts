import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import type { RequestHandler } from './$types';
import { UPLOAD_DIR } from '#lib/server/db/client.ts';
import { MEDIA_TYPES } from '#lib/server/uploads/uploads.service.ts';

// Serves uploaded report photos and videos.
export const GET: RequestHandler = async ({ params }) => {
	if (!/^[\w.-]+$/.test(params.file)) error(400, 'Bad file name');
	try {
		const data = await readFile(join(UPLOAD_DIR, params.file));
		const type = MEDIA_TYPES[extname(params.file).toLowerCase()] ?? 'application/octet-stream';
		return new Response(data, { headers: { 'Content-Type': type, 'Cache-Control': 'private, max-age=3600' } });
	} catch {
		error(404, 'Not found');
	}
};
