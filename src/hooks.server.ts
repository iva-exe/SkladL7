import type { Handle } from "@sveltejs/kit";

/**
 * Disable HTML caching at the server response level.
 *
 * Without this, a cached HTML page can reference chunk hashes from a
 * previous deploy that no longer exist on disk → users see a blank
 * page or "Failed to fetch dynamically imported module" errors.
 *
 * `_app/immutable/*` chunks themselves are content-hashed and remain
 * cacheable forever (handled in vercel.json).
 */
export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	const ct = response.headers.get("content-type") || "";
	if (ct.includes("text/html")) {
		response.headers.set("cache-control", "no-store, must-revalidate");
		response.headers.set("pragma", "no-cache");
		response.headers.set("expires", "0");
	}

	return response;
};
