import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { forecasts } from '#lib/server/forecasts/forecasts.service.ts';
import { rumours } from '#lib/server/rumours/rumours.service.ts';

export const load: LayoutServerLoad = ({ locals }) => {
	if (!locals.user) redirect(303, '/team/login');
	return {
		user: locals.user,
		counts: {
			forecasts: forecasts.list().filter((f) => f.status === 'forecast').length,
			rumours: rumours.queue().filter((r) => r.status === 'checking').length
		}
	};
};
