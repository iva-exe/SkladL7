import { json } from "@sveltejs/kit";
import { createClient } from "@supabase/supabase-js";
import { env } from "$env/dynamic/private";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params }) => {
	const code = params.code?.trim().toUpperCase();
	if (!code) {
		return json({ error: "Kód je povinný." }, { status: 400 });
	}

	const SUPABASE_URL = env.SUPABASE_URL;
	const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY;
	const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;

	if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
		console.error("Connect: Missing env vars:", {
			hasUrl: !!SUPABASE_URL,
			hasServiceKey: !!SUPABASE_SERVICE_KEY,
			hasAnonKey: !!SUPABASE_ANON_KEY,
		});
		return json({ error: "Server nemá nakonfigurované připojení k databázi." }, { status: 500 });
	}

	try {
		// Use service key for server-side lookup (bypasses RLS)
		const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

		console.log(`Connect: Looking up workspace code="${code}"`);

		const { data, error: dbError, status, statusText } = await supabase
			.from("workspaces")
			.select("code, name, active")
			.eq("code", code)
			.single();

		console.log(`Connect: Query result — status=${status}, error=${dbError?.message || "none"}, data=${JSON.stringify(data)}`);

		if (dbError) {
			// PGRST116 = "JSON object requested, multiple (or no) rows returned" — means 0 rows
			if (dbError.code === "PGRST116") {
				return json({ error: `Kód "${code}" nebyl nalezen.` }, { status: 404 });
			}
			console.error("Connect: DB error:", dbError.message, dbError.code, dbError.details, dbError.hint);
			return json({ error: `Chyba databáze: ${dbError.message}` }, { status: 500 });
		}

		if (!data) {
			return json({ error: `Kód "${code}" nebyl nalezen.` }, { status: 404 });
		}

		if (!data.active) {
			return json({ error: "Tento workspace byl deaktivován." }, { status: 403 });
		}

		console.log(`Connect: Success — workspace="${data.name}" code="${data.code}"`);

		// Return publishable (anon) key — safe for client-side use
		return json({
			url: SUPABASE_URL,
			key: SUPABASE_ANON_KEY,
			name: data.name,
			code: data.code,
		});
	} catch (err) {
		console.error("Connect: Unexpected error:", err);
		return json({ error: "Chyba serveru při ověřování kódu." }, { status: 500 });
	}
};
