import { json, error } from "@sveltejs/kit";
import { createClient } from "@supabase/supabase-js";
import { env } from "$env/dynamic/private";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params }) => {
	const code = params.code?.trim().toUpperCase();
	if (!code) {
		throw error(400, "Kód je povinný.");
	}

	const SUPABASE_URL = env.SUPABASE_URL;
	const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY;
	const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;

	if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
		throw error(500, "Server nemá nakonfigurované Supabase credentials.");
	}

	// Use service key for server-side lookup (bypasses RLS)
	const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

	const { data, error: dbError } = await supabase
		.from("workspaces")
		.select("code, name, active")
		.eq("code", code)
		.single();

	if (dbError || !data) {
		throw error(404, "Neplatný kód workspace.");
	}

	if (!data.active) {
		throw error(403, "Tento workspace byl deaktivován.");
	}

	// Return publishable (anon) key — safe for client-side use
	return json({
		url: SUPABASE_URL,
		key: SUPABASE_ANON_KEY,
		name: data.name,
		code: data.code,
	});
};
