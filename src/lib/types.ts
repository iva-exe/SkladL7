export interface Vehicle {
	vin: string;
	model: string;
	status: "naskladneno" | "vyskladneno";
	dateIn: string | null;
	dateOut: string | null;
	dateAdded: string | null;
	sklad: string;
	code: string;
	lastChangedBy: string | null;
	lastChangedAt: string | null;
	/** Comma-separated list of fields changed today (e.g. "status,sklad,code") */
	changedFields: string | null;
	/** Date when changedFields were last set (dd.mm.yyyy) — auto-clears at midnight */
	changedDate: string | null;
}

export interface VehicleRow {
	vin: string;
	model: string;
	status: string;
	date_in: string | null;
	date_out: string | null;
	date_added: string | null;
	sklad: string;
	code: string;
	last_changed_by: string | null;
	last_changed_at: string | null;
	changed_fields: string | null;
	changed_date: string | null;
}

export interface LogEntry {
	id: number;
	user_name: string;
	vin: string | null;
	action: string;
	detail: string | null;
	created_at: string;
}

export interface AppSettings {
	sortCol: string;
	sortDir: "asc" | "desc";
	filterStatus: string;
	filterModel: string;
	filterSklad: string;
	searchVin: string;
}

export function toLocal(r: VehicleRow): Vehicle {
	return {
		vin: r.vin,
		model: r.model,
		status: r.status as Vehicle["status"],
		dateIn: r.date_in,
		dateOut: r.date_out,
		dateAdded: r.date_added,
		sklad: r.sklad,
		code: r.code,
		lastChangedBy: r.last_changed_by,
		lastChangedAt: r.last_changed_at,
		changedFields: r.changed_fields || null,
		changedDate: r.changed_date || null,
	};
}

export function toRow(v: Vehicle): VehicleRow {
	return {
		vin: v.vin,
		model: v.model,
		status: v.status,
		date_in: v.dateIn || null,
		date_out: v.dateOut || null,
		date_added: v.dateAdded || null,
		sklad: v.sklad || null,
		code: v.code || null,
		last_changed_by: v.lastChangedBy || null,
		last_changed_at: v.lastChangedAt || null,
		changed_fields: v.changedFields || null,
		changed_date: v.changedDate || null,
	} as VehicleRow;
}
