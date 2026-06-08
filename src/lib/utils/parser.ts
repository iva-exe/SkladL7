export interface ParsedVehicle {
	vin: string;
	model: string;
	dateIn: string;
	sklad: string;
	code: string;
	/** Names of fields that were missing in the source row (e.g. ["model", "sklad"]) */
	missing: string[];
}

/** A VIN is 17 alphanumeric chars; accept >= 11 to be tolerant, filters out header/junk rows. */
function looksLikeVin(s: string): boolean {
	return /^[A-Za-z0-9]{11,}$/.test(s);
}

/** Derive warehouse from sklad code: codes starting with "D" → Klíčany, otherwise Měšice. */
function skladFromCode(code: string): string {
	if (!code) return "";
	return code.startsWith("D") ? "Klíčany" : "Měšice";
}

export function parseLines(text: string): ParsedVehicle[] {
	return text
		.trim()
		.split("\n")
		.filter((l) => l.trim())
		.reduce<ParsedVehicle[]>((acc, line) => {
			// Excel/Sheets paste uses single tabs — split on single \t so EMPTY
			// cells are preserved (a missing sklad code keeps the date in column 4).
			// Manual paste without tabs falls back to runs of 2+ spaces.
			const hasTab = line.includes("\t");
			const raw = hasTab ? line.split("\t") : line.trim().split(/\s{2,}/);
			const p = raw.map((s) => s.trim());

			const vin = p[0] || "";
			if (!looksLikeVin(vin)) return acc; // skip header rows / junk

			const model = p[1] || "";
			const code = p[2] || "";
			const dateIn = p[3] || "";
			const sklad = skladFromCode(code);

			const missing: string[] = [];
			if (!model) missing.push("model");
			if (!code) missing.push("sklad");

			acc.push({ vin, model, dateIn, sklad, code, missing });
			return acc;
		}, []);
}
