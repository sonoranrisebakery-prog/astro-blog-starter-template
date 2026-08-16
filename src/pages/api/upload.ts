export const prerender = false;

import type { APIRoute } from 'astro';

const ALLOWED_TYPES: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/gif': 'gif',
};

const MAX_BYTES = 25 * 1024 * 1024; // 25MB

function randomId(): string {
	return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

export const POST: APIRoute = async (context) => {
	const env = (context.locals as { runtime?: { env?: Record<string, unknown> } }).runtime?.env;
	const bucket = env?.MEDIA as R2Bucket | undefined;

	if (!bucket) {
		return new Response(
			JSON.stringify({ ok: false, error: 'Media storage is not configured (missing R2 binding).' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } },
		);
	}

	const form = await context.request.formData();
	const file = form.get('file');

	if (!(file instanceof File)) {
		return new Response(JSON.stringify({ ok: false, error: 'No file was uploaded.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const ext = ALLOWED_TYPES[file.type];
	if (!ext) {
		return new Response(
			JSON.stringify({ ok: false, error: 'Unsupported file type. Please upload a JPEG, PNG, WebP, or GIF.' }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } },
		);
	}

	if (file.size > MAX_BYTES) {
		return new Response(JSON.stringify({ ok: false, error: 'File is too large. Max size is 25MB.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const today = new Date().toISOString().slice(0, 10);
	const key = `${today}/${randomId()}.${ext}`;

	await bucket.put(key, await file.arrayBuffer(), {
		httpMetadata: { contentType: file.type },
	});

	return new Response(JSON.stringify({ ok: true, url: `/media/${key}` }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
