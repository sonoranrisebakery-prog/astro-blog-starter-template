import type { APIRoute } from 'astro';
import { SITE_IS_PUBLIC } from '../consts';

// The workers.dev address must never be indexable, even once the real domain
// goes public — it's not the canonical URL and should never surface in search.
export const GET: APIRoute = ({ url }) => {
	const isWorkersDev = url.hostname.endsWith('.workers.dev');
	const allow = SITE_IS_PUBLIC && !isWorkersDev;
	const body = allow ? 'User-agent: *\nAllow: /\n' : 'User-agent: *\nDisallow: /\n';
	return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
};
