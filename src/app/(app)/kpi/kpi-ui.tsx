import Link from "next/link";
import { Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { Translator } from "@/lib/i18n";
import type { Rag } from "@/lib/kpi-rules";
import type { Bounds } from "@/lib/kpi-rules";
import { formatDate } from "@/lib/format";
import { periodQuery } from "./period";

/** The traffic light, in words and a glyph — never colour alone. */
export function RagBadge({ rag, t }: { rag: Rag | null; t: Translator }) {
  if (rag === null)
    return <Badge className="muted bg-[var(--surface)] ring-[var(--line)]">{t("kpi.rag.none")}</Badge>;
  const tone =
    rag === "GREEN"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30"
      : rag === "AMBER"
        ? "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30"
        : "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/30";
  return (
    <Badge className={`whitespace-nowrap ${tone}`}>
      <Icon name={rag === "GREEN" ? "check" : rag === "AMBER" ? "clock" : "alert"} className="mr-1 size-3" />
      {t(`kpi.rag.${rag}`)}
    </Badge>
  );
}

/** A percentage, or a dash when it does not apply. */
export function Pct({ value }: { value: number | null }) {
  return <span className="tabular-nums">{value === null ? "—" : `${value}%`}</span>;
}

/**
 * Month or quarter, earlier or later. Links rather than a client control:
 * the period is in the URL, so a card can be sent to somebody as a link.
 */
export function PeriodSwitch({ bounds, t, base = "/kpi" }: { bounds: Bounds; t: Translator; base?: string }) {
  const chip = "rounded-lg border px-2.5 py-1 text-xs font-medium transition hover:bg-[var(--surface)]";
  const on = "bg-navy-900 text-white hover:bg-navy-800 dark:bg-navy-600 dark:hover:bg-navy-500";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex gap-1">
        {(["month", "quarter"] as const).map((period) => (
          <Link
            key={period}
            href={`${base}${periodQuery(bounds, { period, offset: 0 })}`}
            className={`${chip} ${bounds.period === period ? on : ""}`}
          >
            {t(`kpi.period.${period}`)}
          </Link>
        ))}
      </span>
      <span className="inline-flex items-center gap-1">
        <Link href={`${base}${periodQuery(bounds, { offset: bounds.offset - 1 })}`} className={chip}>
          ← {t("kpi.prev")}
        </Link>
        <span className="muted px-1 text-xs tabular-nums">
          {formatDate(bounds.fromDay)} — {formatDate(bounds.toDay)}
        </span>
        {bounds.offset < 0 && (
          <Link href={`${base}${periodQuery(bounds, { offset: bounds.offset + 1 })}`} className={chip}>
            {t("kpi.next")} →
          </Link>
        )}
      </span>
    </div>
  );
}
