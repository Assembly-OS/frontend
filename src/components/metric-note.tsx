"use client";

import { useT } from "@/components/i18n-provider";
import { Icon } from "@/components/icons";
import { METRICS, type MetricScope } from "@/lib/metrics";
import type { MessageKey } from "@/lib/i18n";

/** The chip's skin, shared by the disclosure and the plain section label. */
const CHIP =
  "muted inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium";

/**
 * The reach of a whole block of figures, stated once in its heading.
 *
 * For a strip whose figures all share one reach and one basis — the command
 * centre's four Assembly-wide counts — a chip on each would say the same thing
 * four times and the opened formula would read "number of records" four times.
 * One label on the heading says it where it is true: for all of them.
 */
export function ScopeChip({ scope }: { scope: MetricScope }) {
  const t = useT();
  return <span className={CHIP}>{t(`metric.scope.${scope}` as MessageKey)}</span>;
}

/**
 * What a figure is counting over, written beside it, and how it is counted,
 * one tap away.
 *
 * The scope is the part that matters most, and it is always visible. The
 * audit's sharpest finding was a dashboard reading "Overdue 0" while the
 * statistics page read 2 — both true, one counted over the reader and one over
 * the Assembly, and neither saying which. The chairman read the zero as
 * "nothing in the Assembly is late". A figure without its reach is not a
 * smaller truth, it is a different claim.
 *
 * The explanation is composed, `<basis> · <scope>`, from the shared registry
 * in `lib/metrics` — the same file the SQL takes its status buckets from.
 * Written out per figure it would be twenty sentences in four languages to
 * keep true, and the first bucket that changed would leave all eighty lying.
 *
 * `<details>` rather than a click handler: it needs no state, survives without
 * JavaScript, and opens on a touch screen, which a `title` tooltip does not —
 * this is read in the Telegram Mini App on a phone. It is rendered as a
 * sibling of a linked card's `<a>`, never inside it: an interactive element
 * within an anchor is invalid markup and eats the tap.
 */
export function MetricNote({ metric }: { metric: string }) {
  const t = useT();
  const meta = METRICS[metric];
  if (!meta) return null;

  const scope = t(`metric.scope.${meta.scope}` as MessageKey);
  const basis = t(`metric.basis.${meta.basis}` as MessageKey);

  return (
    // `details` stays unpositioned on purpose, so both children place
    // themselves against the card rather than against the chip: the chip in
    // the card's corner, the explanation across the card's full width just
    // below it. Anchored to the chip, a 224px box hung off the left edge of
    // the screen from the left-hand card of the two-up phone grid.
    <details className="group">
      <summary
        className={`${CHIP} absolute right-2 top-2 cursor-pointer list-none transition duration-150 hover:bg-[var(--surface)] [&::-webkit-details-marker]:hidden`}
        title={`${basis} · ${scope}`}
      >
        {scope}
        <Icon
          name="chevron"
          aria-hidden
          className="size-3 transition duration-150 group-open:rotate-180"
        />
      </summary>
      <div className="panel absolute inset-x-0 top-full z-10 mt-1 p-3 shadow-lift">
        <p className="muted text-[11px] font-semibold uppercase tracking-wide">
          {t("metric.formula")}
        </p>
        <p className="mt-1 text-xs leading-snug">{basis}</p>
        <p className="muted mt-1 text-[11px]">{scope}</p>
      </div>
    </details>
  );
}
