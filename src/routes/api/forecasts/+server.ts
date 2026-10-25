import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { forecasts } from '#lib/server/forecasts/forecasts.service.ts';

// Active heavy-rain forecasts and approved warnings (public map uses these).
export const GET: RequestHandler = () => json({ forecasts: forecasts.list(), ...forecasts.status });
