import type { RequestHandler } from './$types';
import { audit, type ChangeEvent } from '#lib/server/audit/audit.service.ts';

// Server-sent events: pages refresh their data when anything changes.
export const GET: RequestHandler = ({ request }) => {
	const encoder = new TextEncoder();
	let cleanup = () => {};
	const stream = new ReadableStream({
		start(controller) {
			const write = (chunk: string) => {
				try {
					controller.enqueue(encoder.encode(chunk));
				} catch {
					cleanup();
				}
			};
			const onChange = (e: ChangeEvent) => write(`event: change\ndata: ${JSON.stringify(e)}\n\n`);
			const ping = setInterval(() => write(': ping\n\n'), 25_000);
			cleanup = () => {
				clearInterval(ping);
				audit.bus.off('change', onChange);
			};
			audit.bus.on('change', onChange);
			request.signal.addEventListener('abort', () => {
				cleanup();
				try {
					controller.close();
				} catch {
					/* already closed */
				}
			});
			write(': connected\n\n');
		},
		cancel() {
			cleanup();
		}
	});
	return new Response(stream, {
		headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' }
	});
};
