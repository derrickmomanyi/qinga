import { incidentSelectors } from '#lib/server/incidents/incidents.selectors.ts';
import { forecasts } from '#lib/server/forecasts/forecasts.service.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	incidents: incidentSelectors.publicList(),
	forecasts: forecasts.list()
});
