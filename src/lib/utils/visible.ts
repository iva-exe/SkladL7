import type { Vehicle, AppSettings } from "$lib/types";
import { parseDateVal, calcDays } from "./dates";

/** Apply the toolbar filters (stav, model, sklad, hledat VIN). */
export function filterVehicles(vehicles: Vehicle[], settings: AppSettings): Vehicle[] {
	return vehicles.filter((v) => {
		if (settings.filterStatus !== "all" && v.status !== settings.filterStatus) return false;
		if (settings.filterModel !== "all" && v.model !== settings.filterModel) return false;
		if (settings.filterSklad !== "all" && v.sklad !== settings.filterSklad) return false;
		if (settings.searchVin && !v.vin.toUpperCase().includes(settings.searchVin.toUpperCase())) return false;
		return true;
	});
}

/** Sort by the active table column and direction. */
export function sortVehicles(vehicles: Vehicle[], settings: AppSettings): Vehicle[] {
	const col = settings.sortCol;
	const dir = settings.sortDir === "asc" ? 1 : -1;
	return [...vehicles].sort((a, b) => {
		let va: any, vb: any;
		if (col === "dateIn") { va = parseDateVal(a.dateIn); vb = parseDateVal(b.dateIn); }
		else if (col === "dateOut") { va = parseDateVal(a.dateOut); vb = parseDateVal(b.dateOut); }
		else if (col === "days") { va = calcDays(a.dateIn, a.dateOut) ?? -1; vb = calcDays(b.dateIn, b.dateOut) ?? -1; }
		else if (col === "dateAdded") { va = parseDateVal(a.dateAdded); vb = parseDateVal(b.dateAdded); }
		else if (col === "status") { va = a.status; vb = b.status; }
		else if (col === "sklad") { va = a.sklad || ""; vb = b.sklad || ""; }
		else if (col === "model") { va = a.model; vb = b.model; }
		else { va = a.vin; vb = b.vin; }
		return va < vb ? -dir : va > vb ? dir : 0;
	});
}

/** Rows exactly as the table shows them (filtered, then sorted). */
export function visibleVehicles(vehicles: Vehicle[], settings: AppSettings): Vehicle[] {
	return sortVehicles(filterVehicles(vehicles, settings), settings);
}
