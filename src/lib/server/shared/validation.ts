// Reusable request validation. Services receive already-clean values.

export class ValidationError extends Error {
	constructor(
		message: string,
		readonly field?: string
	) {
		super(message);
	}
}

type Source = FormData | Record<string, unknown>;

function raw(source: Source, key: string): unknown {
	return source instanceof FormData ? source.get(key) : source[key];
}

export function text(source: Source, key: string, opts: { required?: boolean; max?: number } = {}): string | null {
	const value = raw(source, key);
	const str = typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
	if (!str) {
		if (opts.required) throw new ValidationError(`${key} is required`, key);
		return null;
	}
	if (opts.max && str.length > opts.max) throw new ValidationError(`${key} is too long`, key);
	return str;
}

export function oneOf<T extends string>(source: Source, key: string, options: readonly T[], fallback?: T): T | null {
	const value = text(source, key);
	if (value == null) return fallback ?? null;
	if (!options.includes(value as T)) throw new ValidationError(`${key} must be one of ${options.join(', ')}`, key);
	return value as T;
}

export function number(source: Source, key: string, opts: { min?: number; max?: number } = {}): number | null {
	const value = text(source, key);
	if (value == null) return null;
	const num = Number(value);
	if (!Number.isFinite(num)) throw new ValidationError(`${key} must be a number`, key);
	if (opts.min != null && num < opts.min) throw new ValidationError(`${key} is too small`, key);
	if (opts.max != null && num > opts.max) throw new ValidationError(`${key} is too large`, key);
	return num;
}

export function bool(source: Source, key: string): boolean {
	const value = raw(source, key);
	return value === true || value === 'true' || value === 'on' || value === '1';
}

export function file(source: Source, key: string): File | null {
	const value = raw(source, key);
	return value instanceof File && value.size > 0 ? value : null;
}
