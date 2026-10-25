import { areas } from '#lib/server/areas/areas.selectors.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	areas: areas.list().map(({ id, name }) => ({ id, name }))
});
