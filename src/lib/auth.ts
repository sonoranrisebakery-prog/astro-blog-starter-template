const SESSION_COOKIE = 'srb_admin_session';
const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 30; // 30 days

async function hmac(key: string, message: string): Promise<string> {
	const enc = new TextEncoder();
	const cryptoKey = await crypto.subtle.importKey(
		'raw',
		enc.encode(key),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	);
	const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
	return Array.from(new Uint8Array(sig))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let mismatch = 0;
	for (let i = 0; i < a.length; i++) {
		mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return mismatch === 0;
}

export async function createSessionToken(secret: string): Promise<string> {
	const expiry = Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS;
	const sig = await hmac(secret, String(expiry));
	return `${expiry}.${sig}`;
}

export async function verifySessionToken(
	token: string | undefined | null,
	secret: string,
): Promise<boolean> {
	if (!token) return false;
	const [expiryStr, sig] = token.split('.');
	if (!expiryStr || !sig) return false;
	const expiry = Number(expiryStr);
	if (!Number.isFinite(expiry) || expiry < Math.floor(Date.now() / 1000)) return false;
	const expected = await hmac(secret, expiryStr);
	return timingSafeEqual(expected, sig);
}

export { SESSION_COOKIE };
