import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { forecasts } from '#lib/server/forecasts/forecasts.service.ts';
import { messaging } from '#lib/server/messaging/messaging.service.ts';
import { subscribers } from '#lib/server/subscribers/subscribers.service.ts';

export const GET: RequestHandler = () =>
	json({
		ok: true,
		smsProvider: messaging.providerName,
		subscribers: subscribers.activeCount(),
		forecasts: forecasts.status
	});
