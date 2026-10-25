import { CASUALTIES, REPORT_TYPES, SEVERITIES, TYPES, type IncidentType } from '../../constants';
import type { ReportInput } from '../incidents/incidents.service';
import { normalizePhone } from '../shared/phone';
import { bool, number, oneOf, text, ValidationError } from '../shared/validation';

/** Turns the public report form (or the quick report button) into a clean ReportInput. */
export function parseReportForm(form: FormData | Record<string, unknown>): Omit<ReportInput, 'mediaPath' | 'mediaType'> {
	const quick = bool(form, 'quick');
	const chosen = oneOf(form, 'type', REPORT_TYPES);
	if (!chosen && !quick) throw new ValidationError('Choose what happened', 'type');
	const type: IncidentType = chosen ?? 'unknown';

	const subtype = text(form, 'subtype', { max: 40 });
	if (subtype && !TYPES[type].subtypes.includes(subtype)) throw new ValidationError('Unknown kind of incident', 'subtype');

	const anonymous = bool(form, 'anonymous');
	const rawPhone = text(form, 'phone', { max: 20 });
	const phone = rawPhone ? normalizePhone(rawPhone) : null;
	if (rawPhone && !phone && !anonymous) throw new ValidationError('Enter a Kenyan mobile number like 0712 345 678', 'phone');

	const lat = number(form, 'lat', { min: -5, max: 5 });
	const lon = number(form, 'lon', { min: 33, max: 42 });
	const areaId = number(form, 'area_id', { min: 1 });
	if ((lat == null || lon == null) && areaId == null) throw new ValidationError('Share your location or choose your area', 'location');

	return {
		type,
		subtype,
		severity: oneOf(form, 'severity', SEVERITIES),
		casualties: oneOf(form, 'casualties', CASUALTIES),
		note: text(form, 'note', { max: 500 }),
		lat,
		lon,
		areaId,
		locationLabel: text(form, 'location_label', { max: 120 }),
		phone,
		anonymous,
		channel: quick ? 'quick' : 'app'
	};
}
