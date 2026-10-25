// Browser helper for calling the Qinga API from pages.

export type ApiResult<T = Record<string, unknown>> = { ok: true; data: T } | { ok: false; error: string; field?: string };

export async function post<T = Record<string, unknown>>(url: string, body?: FormData | Record<string, unknown>): Promise<ApiResult<T>> {
	const isForm = body instanceof FormData;
	try {
		const res = await fetch(url, {
			method: 'POST',
			headers: isForm || !body ? undefined : { 'Content-Type': 'application/json' },
			body: isForm ? body : body ? JSON.stringify(body) : undefined
		});
		const data = await res.json().catch(() => ({}));
		if (!res.ok) return { ok: false, error: data.error ?? data.message ?? `Request failed (${res.status})`, field: data.field };
		return { ok: true, data: data as T };
	} catch {
		return { ok: false, error: 'No connection. Check your data and try again.' };
	}
}

export async function getJson<T>(url: string): Promise<T> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Request failed (${res.status})`);
	return (await res.json()) as T;
}
