import type { Vehicle } from "$lib/types";
import { parseDateToObj } from "./dates";

export interface MonthBucket {
	/** ISO key "yyyy-mm" — sort key */
	key: string;
	/** "Červen 2026" */
	label: string;
	year: number;
	month: number; // 1-12
	/** Vehicles whose dateIn falls in this month */
	arrived: number;
	/** Vehicles whose dateOut falls in this month */
	departed: number;
	/** Sum of all storage days that overlap with this month, across all vehicles */
	totalDays: number;
	/** How many distinct vehicles contributed at least 1 day to this month */
	activeVehicles: number;
}

const MONTH_NAMES_CS = [
	"Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
	"Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

function monthKey(year: number, month1: number): string {
	return `${year}-${month1 < 10 ? "0" + month1 : month1}`;
}

function monthLabel(year: number, month1: number): string {
	return `${MONTH_NAMES_CS[month1 - 1]} ${year}`;
}

/** Returns the day count of overlap between [aStart, aEnd] (inclusive) and the given calendar month. */
function overlapDaysInMonth(aStart: Date, aEnd: Date, year: number, month0: number): number {
	const monthStart = new Date(year, month0, 1);
	const monthEnd = new Date(year, month0 + 1, 0); // last day of month
	const start = aStart > monthStart ? aStart : monthStart;
	const end = aEnd < monthEnd ? aEnd : monthEnd;
	if (start > end) return 0;
	return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
}

/**
 * Aggregate vehicles into per-month buckets.
 *
 * For each vehicle:
 *  - "arrived" counts in the month containing dateIn
 *  - "departed" counts in the month containing dateOut (if any)
 *  - Storage days are split per-month based on overlap of [dateIn, effectiveEnd] with each calendar month,
 *    where effectiveEnd = dateOut (if present) else min(today, end of month being computed).
 *    Concretely: a still-active vehicle counts days only up to today (or end-of-month for past months),
 *    matching the rule "if not yet destocked, count only up to end of that month".
 */
export function aggregateMonthly(vehicles: Vehicle[]): MonthBucket[] {
	const buckets = new Map<string, MonthBucket>();
	const activeSets = new Map<string, Set<string>>();

	function ensure(year: number, month1: number): MonthBucket {
		const k = monthKey(year, month1);
		let b = buckets.get(k);
		if (!b) {
			b = {
				key: k,
				label: monthLabel(year, month1),
				year,
				month: month1,
				arrived: 0,
				departed: 0,
				totalDays: 0,
				activeVehicles: 0,
			};
			buckets.set(k, b);
			activeSets.set(k, new Set());
		}
		return b;
	}

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	for (const v of vehicles) {
		const inDate = parseDateToObj(v.dateIn);
		if (!inDate) continue;
		const outDate = parseDateToObj(v.dateOut);

		// arrival counter
		const inB = ensure(inDate.getFullYear(), inDate.getMonth() + 1);
		inB.arrived++;

		// departure counter
		if (outDate) {
			const outB = ensure(outDate.getFullYear(), outDate.getMonth() + 1);
			outB.departed++;
		}

		// effective end of storage = dateOut, or today if still in storage
		const effectiveEnd = outDate ?? today;
		if (effectiveEnd < inDate) continue;

		// Walk every month from inDate to effectiveEnd, add overlap days
		let cursor = new Date(inDate.getFullYear(), inDate.getMonth(), 1);
		const stop = new Date(effectiveEnd.getFullYear(), effectiveEnd.getMonth(), 1);
		while (cursor <= stop) {
			const y = cursor.getFullYear();
			const m1 = cursor.getMonth() + 1;
			const days = overlapDaysInMonth(inDate, effectiveEnd, y, cursor.getMonth());
			if (days > 0) {
				const b = ensure(y, m1);
				b.totalDays += days;
				activeSets.get(b.key)!.add(v.vin);
			}
			cursor = new Date(y, cursor.getMonth() + 1, 1);
		}
	}

	// Fill activeVehicles counts
	for (const [k, set] of activeSets) {
		const b = buckets.get(k)!;
		b.activeVehicles = set.size;
	}

	// Sort newest first
	return [...buckets.values()].sort((a, b) => b.key.localeCompare(a.key));
}
