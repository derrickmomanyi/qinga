// Kenyan mobile numbers, stored as +2547XXXXXXXX / +2541XXXXXXXX.

export function normalizePhone(input: string | null | undefined): string | null {
	if (!input) return null;
	const digits = input.replace(/[^\d+]/g, '');
	let local: string | null = null;
	if (/^\+254[17]\d{8}$/.test(digits)) local = digits.slice(4);
	else if (/^254[17]\d{8}$/.test(digits)) local = digits.slice(3);
	else if (/^0[17]\d{8}$/.test(digits)) local = digits.slice(1);
	else if (/^[17]\d{8}$/.test(digits)) local = digits;
	return local ? `+254${local}` : null;
}

export function maskPhone(phone: string | null | undefined): string {
	if (!phone) return 'Anonymous';
	const local = phone.replace(/^\+254/, '0');
	return `${local.slice(0, 2)}•• ••• ${local.slice(-3)}`;
}

export function displayPhone(phone: string): string {
	const local = phone.replace(/^\+254/, '0');
	return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}
