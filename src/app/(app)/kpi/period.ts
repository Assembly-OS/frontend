import { kpiBounds, type Bounds, type KpiPeriod } from "@/lib/kpi-rules";

/** `?period=month|quarter&offset=-N`, clamped to a year back. */
export function readPeriod(params: { period?: string; offset?: string }): Bounds {
  const period: KpiPeriod = params.period === "quarter" ? "quarter" : "month";
  const raw = Number(params.offset);
  const limit = period === "quarter" ? -4 : -12;
  const offset = Number.isInteger(raw) ? Math.min(0, Math.max(limit, raw)) : 0;
  return kpiBounds(period, offset);
}

export function periodQuery(bounds: Bounds, patch: Partial<Pick<Bounds, "period" | "offset">> = {}): string {
  const period = patch.period ?? bounds.period;
  const offset = patch.offset ?? bounds.offset;
  return `?period=${period}&offset=${offset}`;
}
