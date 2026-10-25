import { AfricasTalkingSmsProvider } from './africastalking.provider';
import { SimulatedSmsProvider } from './simulated.provider';
import type { SmsProvider } from './sms.provider';

export type { SmsProvider, SendResult } from './sms.provider';

// Real gateway when Africa's Talking credentials are set, otherwise the simulator.
export function createSmsProvider(env: NodeJS.ProcessEnv = process.env): SmsProvider {
	if (env.AT_USERNAME && env.AT_API_KEY) {
		return new AfricasTalkingSmsProvider(env.AT_USERNAME, env.AT_API_KEY, env.AT_SENDER_ID || undefined);
	}
	return new SimulatedSmsProvider();
}
