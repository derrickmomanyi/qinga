import type { RequestHandler } from './$types';
import { reporting, PERIODS, type Period } from '#lib/server/reporting/reporting.selectors.ts';
import { requireUser } from '#lib/server/shared/http.ts';

// Who received, processed and confirmed each incident, as a spreadsheet.
export const GET: RequestHandler = ({ locals, url }) => {
	requireUser(locals);
	const asked = url.searchParams.get('period') ?? 'week';
	const period: Period = asked in PERIODS ? (asked as Period) : 'week';
	return new Response(reporting.csv(reporting.rows(period)), {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="qinga-report-${period}.csv"`
		}
	});
};
