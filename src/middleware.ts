import { defineMiddleware } from 'astro:middleware';
import { SESSION_COOKIE, verifySessionToken } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
	const { pathname } = context.url;
	const isProtectedPage = pathname.startsWith('/admin') && pathname !== '/admin/login';
	const isProtectedApi = pathname === '/api/publish' || pathname === '/api/upload';

	if (!isProtectedPage && !isProtectedApi) {
		return next();
	}

	const env = (context.locals as { runtime?: { env?: Record<string, string> } }).runtime?.env;
	const password = env?.EDITOR_PASSWORD ?? import.meta.env.EDITOR_PASSWORD;

	if (!password) {
		return new Response(
			'EDITOR_PASSWORD is not configured. Add it as a secret in the Cloudflare dashboard (or .dev.vars locally).',
			{ status: 500 },
		);
	}

	const token = context.cookies.get(SESSION_COOKIE)?.value;
	const authed = await verifySessionToken(token, password);

	if (!authed) {
		if (isProtectedApi) {
			return new Response(JSON.stringify({ error: 'Not authenticated' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		return context.redirect(`/admin/login?next=${encodeURIComponent(pathname)}`);
	}

	return next();
});
