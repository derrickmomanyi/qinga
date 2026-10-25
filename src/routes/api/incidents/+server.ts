import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { incidentSelectors } from '#lib/server/incidents/incidents.selectors.ts';

// Verified incidents the public can see.
export const GET: RequestHandler = () => json({ incidents: incidentSelectors.publicList() });
