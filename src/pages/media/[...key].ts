export const prerender = false;

import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
	const env = (context.locals as { runtime?: { env?: Record<string, unknown> } }).runtime?.env;
	const bucket = env?.MEDIA as R2Bucket | undefined;
	const key = context.params.key;

	if (!bucket || !key) {
		return new Response('Not found', { status: 404 });
	}

	const object = await bucket.get(key);
	if (!object) {
		return new Response('Not found', { status: 404 });
	}

	return new Response(object.body, {
		headers: {
			'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
			'Cache-Control': 'public, max-age=31536000, immutable',
			ETag: object.httpEtag,
		},
	});
};
