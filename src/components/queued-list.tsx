"use client";

import { useState } from "react";
import { useT } from "./i18n-provider";
import { Icon } from "./icons";
import { Badge } from "./ui";
import { formatDate } from "@/lib/format";
import { priorityTone, type QueuedTaskRow } from "@/lib/types";
import type { MessageKey } from "@/lib/i18n";

/**
 * «Sizga kelmoqda» — stages that will reach this person later.
 *
 * Read-only on purpose: there is nothing to do yet, and a button that cannot
 * be pressed is worse than no button. It is deliberately outside every counter
 * too, because these are not this person's workload today. What it buys is
 * that nobody has a half-finished assignment drop on them out of nowhere.
 *
 * Its own card rather than a `TaskList` variant: no actions, no filters and a
 * different row type, so folding it into `actionsFor` would add a branch that
 * always returns an empty array.
 *
 * Nothing waiting renders nothing at all — a collapsed heading over an empty
 * section is a border carrying no information.
 */
export function QueuedList({ tasks }: { tasks: QueuedTaskRow[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  if (tasks.length === 0) return null;

  return (
    <section className="panel mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-5 py-3.5 text-left transition duration-150 hover:bg-[var(--surface)]"
      >
        <Icon name="clock" className="muted size-4 shrink-0" />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight">
          {t("chain.queued.title")}
        </h2>
        <span className="muted rounded-full bg-[var(--surface)] px-2 py-0.5 text-[11px] font-semibold tabular-nums">
          {tasks.length}
        </span>
        <Icon
          name="chevron"
          className={`muted size-4 shrink-0 transition duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t p-4 lg:p-5">
          <p className="muted text-xs">{t("chain.queued.desc")}</p>
          {tasks.map((task) => (
            <article
              key={`${task.id}-${task.stage_position}`}
              className="rounded-xl border p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="muted font-mono text-[11px] font-semibold">
                  {task.code}
                </span>
                <Badge className={priorityTone(task.priority)}>
                  {t(`priority.${task.priority}` as MessageKey)}
                </Badge>
                <span className="muted text-[11px] font-semibold">
                  {t("chain.stage")}{" "}
                  <span className="tabular-nums">
                    {task.stage_position}/{task.stage_count}
                  </span>
                </span>
              </div>

              <h3 className="mt-1.5 text-sm font-semibold leading-snug">
                {task.title}
              </h3>

              {task.instruction && (
                <p className="mt-1.5 text-sm leading-relaxed">
                  {task.instruction}
                </p>
              )}

              <div className="muted mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span>
                  {t("chain.queued.holder")}:{" "}
                  <span className="font-medium">{task.holder_name}</span>
                </span>
                <span>
                  {t("tasks.from")}:{" "}
                  <span className="font-medium">{task.from_name}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="clock" className="size-3.5" />
                  {task.deadline
                    ? formatDate(task.deadline)
                    : t("tasks.noDeadline")}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
