import type { HandleClientError } from "@sveltejs/kit";

/**
 * Recover from chunk-load failures after a fresh deploy.
 *
 * Problem: the browser (or CDN) holds a stale HTML page that references
 * old `_app/immutable/*` chunk hashes. The new build replaced those
 * files, so the import 404s and the app silently fails to navigate.
 *
 * Fix: detect the failure and force a hard reload with a cache-busting
 * query so the browser fetches fresh HTML + new chunk references.
 *
 * Guard: store a flag in sessionStorage so a genuinely broken deploy
 * doesn't loop forever — we only reload once per session.
 */
function looksLikeChunkLoadError(err: unknown): boolean {
	const msg = err instanceof Error ? err.message : String(err ?? "");
	return (
		msg.includes("Failed to fetch dynamically imported module") ||
		msg.includes("error loading dynamically imported module") ||
		msg.includes("Importing a module script failed") ||
		msg.includes("Loading chunk") ||
		msg.includes("Loading CSS chunk")
	);
}

const RELOAD_FLAG = "sklad_chunk_reload_attempted";

function tryRecover(err: unknown): void {
	if (typeof window === "undefined") return;
	if (!looksLikeChunkLoadError(err)) return;

	const already = sessionStorage.getItem(RELOAD_FLAG);
	if (already) {
		console.warn("Chunk load failed twice — not reloading again", err);
		return;
	}
	sessionStorage.setItem(RELOAD_FLAG, "1");
	console.warn("Stale chunks detected — reloading with cache buster", err);
	const url = new URL(window.location.href);
	url.searchParams.set("_v", Date.now().toString());
	window.location.replace(url.toString());
}

// Catch errors that bubble through SvelteKit's navigation/render pipeline
export const handleError: HandleClientError = ({ error }) => {
	tryRecover(error);
};

// Belt-and-suspenders: also catch raw window errors and unhandled promise rejections
if (typeof window !== "undefined") {
	window.addEventListener("error", (e) => tryRecover(e.error ?? e.message));
	window.addEventListener("unhandledrejection", (e) => tryRecover(e.reason));

	// Clear the reload flag once the app successfully boots — gives us another
	// shot at recovery if the user keeps the tab open across multiple deploys.
	queueMicrotask(() => {
		try {
			sessionStorage.removeItem(RELOAD_FLAG);
		} catch { /* private mode etc. */ }
	});
}
