import { get, run } from '../db/client';
import { audit } from '../audit/audit.service';

const DEFAULTS = {
	// Starting point to tune against past Nairobi floods; the team can change it on the forecast page.
	rain_threshold_mm_3h: '10',
	models_needed: '2'
} as const;

type Key = keyof typeof DEFAULTS;

class SettingsService {
	get(key: Key): string {
		return get<{ value: string }>('SELECT value FROM settings WHERE key = ?', key)?.value ?? DEFAULTS[key];
	}

	number(key: Key): number {
		return Number(this.get(key));
	}

	set(key: Key, value: string, actor: string) {
		run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
		audit.record('setting', null, 'changed', actor, `${key} = ${value}`);
	}
}

export const settings = new SettingsService();
