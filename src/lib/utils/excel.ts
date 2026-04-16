import * as XLSX from "xlsx";
import type { Vehicle } from "$lib/types";
import { calcDays } from "$lib/utils/dates";

export function exportToExcel(vehicles: Vehicle[], filename?: string): void {
	const data = vehicles.map((v) => ({
		"VIN": v.vin,
		"Model": v.model,
		"Sklad": v.sklad || "",
		"Kód": v.code || "",
		"Stav": v.status === "naskladneno" ? "Naskladněno" : "Vyskladněno",
		"Naskladněno": v.dateIn || "",
		"Vyskladněno": v.dateOut || "",
		"Dny": calcDays(v.dateIn, v.dateOut) ?? "",
		"Datum přidání": v.dateAdded || "",
	}));

	const ws = XLSX.utils.json_to_sheet(data);

	// Column widths
	ws["!cols"] = [
		{ wch: 20 }, // VIN
		{ wch: 14 }, // Model
		{ wch: 10 }, // Sklad
		{ wch: 10 }, // Kód
		{ wch: 14 }, // Stav
		{ wch: 12 }, // Naskladněno
		{ wch: 12 }, // Vyskladněno
		{ wch: 6 },  // Dny
		{ wch: 14 }, // Datum přidání
	];

	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, "Vozidla");

	const fname = filename || `sklad_${new Date().toISOString().slice(0, 10)}.xlsx`;
	XLSX.writeFile(wb, fname);
}
