export type ReportPeriod = "week" | "month";

/**
 * `?period=` and `?week=` as both report pages read them, so the table and the
 * list opened from it always land on the same stretch.
 *
 * `?week=-1` is the previous stretch, whichever kind is selected. Clamped to a
 * year back either way: fifty-two weeks, twelve months.
 */
export function reportPeriod(filters: { week?: string; period?: string }): {
  period: ReportPeriod;
  offset: number;
} {
  const period = filters.period === "month" ? "month" : "week";
  const raw = Number(filters.week);
  const limit = period === "month" ? -12 : -52;
  const offset = Number.isInteger(raw) ? Math.min(0, Math.max(limit, raw)) : 0;
  return { period, offset };
}
