export const prerender = false;

import type { APIRoute } from 'astro';

const GITHUB_OWNER = 'sonoranrisebakery-prog';
const GITHUB_REPO = 'astro-blog-starter-template';
const GITHUB_BRANCH = 'main';
const JOURNAL_DIR = 'src/content/journal';

function slugify(title: string): string {
	return title
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

function toYamlString(value: string): string {
	return JSON.stringify(value);
}

function base64Encode(str: string): string {
	return btoa(unescape(encodeURIComponent(str)));
}

export const POST: APIRoute = async (context) => {
	const env = (context.locals as { runtime?: { env?: Record<string, string> } }).runtime?.env;
	const githubToken = env?.GITHUB_TOKEN ?? import.meta.env.GITHUB_TOKEN;

	if (!githubToken) {
		return new Response(
			JSON.stringify({
				ok: false,
				error: 'GITHUB_TOKEN is not configured. Add it as a secret in the Cloudflare dashboard.',
			}),
			{ status: 500, headers: { 'Content-Type': 'application/json' } },
		);
	}

	let payload: {
		title?: string;
		description?: string;
		body?: string;
		pubDate?: string;
		heroImage?: string;
	};
	try {
		payload = await context.request.json();
	} catch {
		return new Response(JSON.stringify({ ok: false, error: 'Invalid request body.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const title = payload.title?.trim();
	const description = payload.description?.trim();
	const body = payload.body?.trim();
	const pubDate = payload.pubDate?.trim() || new Date().toISOString().slice(0, 10);
	const heroImage = payload.heroImage?.trim();

	if (!title || !description || !body) {
		return new Response(
			JSON.stringify({ ok: false, error: 'Title, description, and body are all required.' }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } },
		);
	}

	const slug = slugify(title);
	if (!slug) {
		return new Response(JSON.stringify({ ok: false, error: 'Title must contain letters or numbers.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const frontmatterLines = [
		'---',
		`title: ${toYamlString(title)}`,
		`description: ${toYamlString(description)}`,
		`pubDate: ${toYamlString(pubDate)}`,
	];
	if (heroImage) {
		frontmatterLines.push(`heroImage: ${toYamlString(heroImage)}`);
	}
	frontmatterLines.push('---', '', body, '');
	const fileContent = frontmatterLines.join('\n');

	const path = `${JOURNAL_DIR}/${slug}.md`;
	const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;

	const ghResponse = await fetch(apiUrl, {
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${githubToken}`,
			Accept: 'application/vnd.github+json',
			'User-Agent': 'sonoran-rise-bakery-journal-editor',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			message: `Journal post: ${title}`,
			content: base64Encode(fileContent),
			branch: GITHUB_BRANCH,
		}),
	});

	if (!ghResponse.ok) {
		const errText = await ghResponse.text();
		const alreadyExists = ghResponse.status === 422;
		return new Response(
			JSON.stringify({
				ok: false,
				error: alreadyExists
					? 'A post with this title already exists. Try a slightly different title.'
					: `GitHub error (${ghResponse.status}): ${errText}`,
			}),
			{ status: 502, headers: { 'Content-Type': 'application/json' } },
		);
	}

	return new Response(JSON.stringify({ ok: true, slug, path: `/journal/${slug}` }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
