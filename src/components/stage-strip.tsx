"use client";

import { useT } from "./i18n-provider";
import { Icon } from "./icons";
import { initials } from "@/lib/format";
import type { MessageKey } from "@/lib/i18n";

/**
 * Where the assignment is in its chain: who has finished, who holds it now,
 * who is still waiting.
 *
 * Its own component rather than more markup inside `task-list.tsx`, which is
 * already long enough that one more nested block would hide the card itself.
 *
 * Returns nothing at all when there is only one stage — that is the guarantee
 * that an ordinary one-person assignment looks exactly as it did before.
 */
export function StageStrip({
  names,
  current,
  total,
}: {
  /** Participants in order, from `task.stage_names`. */
  names: string[];
  current: number;
  total: number;
}) {
  const t = useT();
  if (total <= 1) return null;

  // The names come from a join that can be out of step with `stage_count` for
  // a moment after a write. Numbers are a worse label than a name but a much
  // better one than a strip that silently loses a step.
  const steps =
    names.length === total ? names : Array.from({ length: total }, () => "");

  const stateKey = (position: number): MessageKey =>
    position < current
      ? "chain.step.done"
      : position === current
        ? "chain.step.now"
        : "chain.step.waiting";

  return (
    <ol className="scroll-thin mt-2 flex items-center gap-1 overflow-x-auto py-0.5">
      {steps.map((name, index) => {
        const position = index + 1;
        const done = position < current;
        const active = position === current;
        const label = `${position}. ${name || position} — ${t(stateKey(position))}`;
        return (
          <li key={position} className="flex shrink-0 items-center gap-1">
            {index > 0 && (
              <Icon name="chevron" className="muted size-3.5 -rotate-90" />
            )}
            <span
              title={label}
              aria-label={label}
              className={`grid size-7 place-items-center rounded-full text-[10px] font-bold tabular-nums ${
                done
                  ? "bg-emerald-600 text-white"
                  : active
                    ? "bg-navy-900 text-white ring-2 ring-navy-500/40 dark:bg-navy-600"
                    : "muted border"
              }`}
            >
              {name ? initials(name) : position}
            </span>
          </li>
        );
      })}
      <li className="muted shrink-0 pl-1 text-[11px] font-semibold">
        {t("chain.stage")}{" "}
        <span className="tabular-nums">
          {current}/{total}
        </span>
      </li>
    </ol>
  );
}
