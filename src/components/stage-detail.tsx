"use client";

import { useEffect, useState } from "react";
import { useT } from "./i18n-provider";
import { Badge, Skeleton } from "./ui";
import { formatDateTime, initials } from "@/lib/format";
import type { MessageKey } from "@/lib/i18n";
import type { TaskStage } from "@/lib/types";

type Stage = TaskStage & { to_name: string };

/**
 * Who was asked for what, and what each of them handed back.
 *
 * The strip at the top of a card says where the work is; this says what the
 * work was. Both are needed for different questions — "is it moving" and "what
 * did Mirzohid actually do" — and only the second one is worth the round trip,
 * so it is fetched when the card opens rather than shipped with the list.
 */
export function StageDetail({ taskId }: { taskId: number }) {
  const t = useT();
  const [stages, setStages] = useState<Stage[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const response = await fetch(`/api/tasks/${taskId}/stages`);
        if (!response.ok) throw new Error("stages");
        const data = (await response.json()) as { stages: Stage[] };
        if (alive) setStages(data.stages);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    // The card can be closed before the answer lands; writing state into an
    // unmounted component is a warning nobody can act on.
    return () => {
      alive = false;
    };
  }, [taskId]);

  if (failed) return <p className="muted text-xs">{t("common.error")}</p>;

  if (!stages) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div>
      <p className="muted mb-2 text-[11px] font-semibold uppercase tracking-wide">
        {t("chain.whoDoesWhat")}
      </p>

      <ol className="space-y-2">
        {stages.map((stage) => {
          const done = stage.status === "BAJARILDI" || Boolean(stage.closed_at);
          const waiting = stage.status === "KUTMOQDA";

          return (
            <li
              key={stage.id}
              className="rounded-xl border px-3 py-2.5"
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                    done
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : waiting
                        ? "bg-[var(--surface)] muted"
                        : "bg-navy-500/15 text-navy-700 dark:text-navy-200"
                  }`}
                >
                  {initials(stage.to_name)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="muted tabular-nums text-xs">
                      {stage.position}.
                    </span>
                    <span className="font-medium">{stage.to_name}</span>
                    <Badge
                      className={
                        done
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30"
                          : waiting
                            ? "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/30"
                            : "bg-navy-50 text-navy-700 ring-navy-600/20 dark:bg-navy-500/10 dark:text-navy-200 dark:ring-navy-400/30"
                      }
                    >
                      {waiting
                        ? t("chain.step.waiting")
                        : t(`status.${stage.status}` as MessageKey)}
                    </Badge>
                  </p>

                  {/* The instruction is what this person was asked to do. When
                      it is empty they were given the assignment's own
                      description, and repeating it on every row would say the
                      same thing three times. */}
                  {stage.instruction && (
                    <p className="mt-1 text-sm leading-relaxed">
                      {stage.instruction}
                    </p>
                  )}

                  {stage.result_comment && (
                    <p className="mt-1.5 rounded-lg bg-[var(--surface)] px-2.5 py-1.5 text-sm leading-relaxed">
                      {stage.result_comment}
                    </p>
                  )}

                  {stage.submitted_at && (
                    <p className="muted mt-1 text-[11px] tabular-nums">
                      {t("action.submit")}: {formatDateTime(stage.submitted_at)}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
