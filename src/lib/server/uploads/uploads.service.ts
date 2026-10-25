import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { UPLOAD_DIR } from '../db/client';
import { ValidationError } from '../shared/validation';

const MAX_BYTES = 25 * 1024 * 1024;
const EXT: Record<string, string> = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/webp': '.webp',
	'image/heic': '.heic',
	'video/mp4': '.mp4',
	'video/quicktime': '.mov',
	'video/webm': '.webm'
};

export const MEDIA_TYPES: Record<string, string> = Object.fromEntries(Object.entries(EXT).map(([type, ext]) => [ext, type]));

class UploadsService {
	async save(file: File): Promise<{ path: string; type: 'image' | 'video' }> {
		if (file.size > MAX_BYTES) throw new ValidationError('Photo or video must be under 25 MB', 'media');
		const ext = EXT[file.type] ?? (file.type.startsWith('image/') || file.type.startsWith('video/') ? extname(file.name) : null);
		if (!ext) throw new ValidationError('Only photos and videos can be uploaded', 'media');
		const name = `${Date.now()}-${randomBytes(6).toString('hex')}${ext.toLowerCase()}`;
		await writeFile(join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
		return { path: name, type: file.type.startsWith('video/') ? 'video' : 'image' };
	}
}

export const uploads = new UploadsService();
