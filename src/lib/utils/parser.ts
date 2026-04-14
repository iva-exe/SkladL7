export interface ParsedVehicle {
	vin: string;
	model: string;
	dateIn: string;
	sklad: string;
	code: string;
}

export function parseLines(text: string): ParsedVehicle[] {
	return text
		.trim()
		.split("\n")
		.filter((l) => l.trim())
		.reduce<ParsedVehicle[]>((acc, line) => {
			const p = line.trim().split(/\t+|\s{2,}/);
			if (p.length >= 4 && p[0] && p[1] && p[3]) {
				const code = (p[2] || "").trim();
				const sklad = code.startsWith("D") ? "Klíčany" : "Měšice";
				const codeRest = code.length > 1 ? code.substring(1) : "";
				acc.push({
					vin: p[0].trim(),
					model: p[1].trim(),
					dateIn: p[3].trim(),
					sklad,
					code: codeRest,
				});
			}
			return acc;
		}, []);
}
