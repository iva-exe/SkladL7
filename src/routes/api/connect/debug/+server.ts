import { json } from "@sveltejs/kit";
import { createClient } from "@supabase/supabase-js";
import { env } from "$env/dynamic/private";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
	const SUPABASE_URL = env.SUPABASE_URL;
	const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY;
	const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;

	const diagnostics: Record<string, unknown> = {
		step1_env_vars: {
			SUPABASE_URL: SUPABASE_URL ? `${SUPABASE_URL.substring(0, 30)}...` : "MISSING",
			SUPABASE_SERVICE_KEY: SUPABASE_SERVICE_KEY ? `${SUPABASE_SERVICE_KEY.substring(0, 20)}...` : "MISSING",
			SUPABASE_ANON_KEY: SUPABASE_ANON_KEY ? `${SUPABASE_ANON_KEY.substring(0, 20)}...` : "MISSING",
		},
	};

	if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
		diagnostics.result = "FAIL — missing env vars, cannot proceed";
		return json(diagnostics);
	}

	try {
		const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
		diagnostics.step2_client = "OK — client created";

		// Try listing all rows in workspaces table
		const { data, error, status, statusText } = await supabase
			.from("workspaces")
			.select("*");

		diagnostics.step3_query = {
			status,
			statusText,
			error: error ? { message: error.message, code: error.code, details: error.details, hint: error.hint } : null,
			rowCount: data?.length ?? 0,
			rows: data,
		};

		if (error) {
			diagnostics.result = `FAIL — query error: ${error.message}`;
		} else {
			diagnostics.result = `OK — found ${data?.length ?? 0} workspaces`;
		}
	} catch (err) {
		diagnostics.step2_client = `FAIL — ${err instanceof Error ? err.message : String(err)}`;
		diagnostics.result = "FAIL — exception during query";
	}

	return json(diagnostics);
};
