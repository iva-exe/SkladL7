function pad(n: number): string {
	return n < 10 ? "0" + n : "" + n;
}

function formatDate(d: Date): string {
	return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function todayStr(): string {
	return formatDate(new Date());
}

export function yesterdayStr(): string {
	const d = new Date();
	d.setDate(d.getDate() - 1);
	return formatDate(d);
}

export function nowStr(): string {
	const d = new Date();
	return `${formatDate(d)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseDateToObj(str: string | null): Date | null {
	if (!str) return null;
	const p = str.split(".");
	return p.length === 3 ? new Date(+p[2], +p[1] - 1, +p[0]) : null;
}

export function parseDateVal(str: string | null): number {
	if (!str) return 0;
	const p = str.split(".");
	return p.length === 3 ? +p[2] * 10000 + +p[1] * 100 + +p[0] : 0;
}

export function calcDays(dateIn: string | null, dateOut: string | null): number | null {
	const f = parseDateToObj(dateIn);
	if (!f) return null;
	const t = dateOut ? parseDateToObj(dateOut) : new Date();
	return t ? Math.max(0, Math.floor((t.getTime() - f.getTime()) / 86400000)) : null;
}

/** Convert dd.mm.yyyy -> yyyy-mm-dd for native date input */
export function toIsoDate(cs: string | null): string {
	if (!cs) return "";
	const p = cs.split(".");
	return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : "";
}

/** Convert yyyy-mm-dd -> dd.mm.yyyy */
export function fromIsoDate(iso: string): string | null {
	if (!iso) return null;
	const [y, m, d] = iso.split("-");
	return `${d}.${m}.${y}`;
}
