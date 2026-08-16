import type { APIRoute } from 'astro';
import { SITE_IS_PUBLIC } from '../consts';

export const GET: APIRoute = () => {
	const body = SITE_IS_PUBLIC ? 'User-agent: *\nAllow: /\n' : 'User-agent: *\nDisallow: /\n';
	return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
};
