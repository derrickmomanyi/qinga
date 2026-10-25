import { all, get, insert, nowIso, run } from '../db/client';
import { audit } from '../audit/audit.service';
import { distanceKm } from '../shared/geo';
import { maskPhone } from '../shared/phone';
import type { Recipient } from '../messaging/messaging.service';

type SubscriberRow = { phone: string; language: string; lat: number; lon: number; area_id: number };

class SubscribersService {
	subscribe(phone: string, areaId: number, language: 'en' | 'sw', source: 'web' | 'sms') {
		const existing = get<{ id: number }>('SELECT id FROM subscribers WHERE phone = ?', phone);
		if (existing) {
			run('UPDATE subscribers SET area_id = ?, language = ?, active = 1 WHERE id = ?', areaId, language, existing.id);
			audit.record('subscriber', existing.id, 'updated', maskPhone(phone), `area ${areaId}, ${language}`);
			return existing.id;
		}
		const id = insert(
			'INSERT INTO subscribers (phone, area_id, language, source, created_at) VALUES (?, ?, ?, ?, ?)',
			phone,
			areaId,
			language,
			source,
			nowIso()
		);
		audit.record('subscriber', id, 'subscribed', maskPhone(phone), `via ${source}`);
		return id;
	}

	unsubscribe(phone: string): boolean {
		const row = get<{ id: number }>('SELECT id FROM subscribers WHERE phone = ? AND active = 1', phone);
		if (!row) return false;
		run('UPDATE subscribers SET active = 0 WHERE id = ?', row.id);
		audit.record('subscriber', row.id, 'unsubscribed', maskPhone(phone));
		return true;
	}

	/** Active subscribers whose area centre is within the radius, or in the given area. */
	near(lat: number, lon: number, radiusKm: number, alsoAreaId?: number | null): Recipient[] {
		return all<SubscriberRow>(
			`SELECT s.phone, s.language, s.area_id, a.lat, a.lon FROM subscribers s JOIN areas a ON a.id = s.area_id WHERE s.active = 1`
		)
			.filter((s) => s.area_id === alsoAreaId || distanceKm(lat, lon, s.lat, s.lon) <= radiusKm)
			.map(({ phone, language }) => ({ phone, language }));
	}

	activeCount(): number {
		return get<{ n: number }>('SELECT COUNT(*) AS n FROM subscribers WHERE active = 1')?.n ?? 0;
	}
}

export const subscribers = new SubscribersService();
