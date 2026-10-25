// Team desk feedback: one toast at a time, plus a helper that calls the API,
// shows the toast and reloads the page data.
import { refreshAll } from '$app/navigation';
import { post, type ApiResult } from '../../api.ts';

let message = $state<string | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;

export const toast = {
	get message() {
		return message;
	},
	show(text: string) {
		message = text;
		clearTimeout(timer);
		timer = setTimeout(() => (message = null), 4500);
	}
};

type Body = Record<string, unknown> | undefined;

export async function act<T = Record<string, unknown>>(
	url: string,
	body: Body,
	success: string | ((data: T) => string)
): Promise<ApiResult<T>> {
	const res = await post<T>(url, body);
	if (res.ok) {
		toast.show(typeof success === 'function' ? success(res.data) : success);
		await refreshAll();
	}
	return res;
}
