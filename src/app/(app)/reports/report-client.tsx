"use client";

import Link from "next/link";
import { useT } from "@/components/i18n-provider";
import { Icon } from "@/components/icons";
import { Badge, PageHeader, Panel, ProgressBar, StatCard } from "@/components/ui";
import type { MessageKey } from "@/lib/i18n";
import type { WeeklyReport, WeeklyRow } from "@/lib/reports";

/** Did this person move anything at all this week? */
function worked(row: WeeklyRow): boolean {
  return row.actions > 0 || row.messages > 0;
}

export function ReportClient({ report }: { report: WeeklyReport }) {
  const t = useT();
  const { week, totals, rows } = report;

  const active = rows.filter(worked);
  const idle = rows.filter((row) => !worked(row));

  return (
    <>
      <PageHeader
        title={t("report.title")}
        description={t("report.subtitle")}
        action={
          <div className="flex items-center gap-1.5">
            <Link
              href={`/reports?week=${week.offset - 1}`}
              className="muted grid size-9 place-items-center rounded-xl border transition hover:bg-[var(--surface)]"
              aria-label={t("report.prevWeek")}
            >
              <Icon name="chevron" className="size-4 rotate-90" />
            </Link>
            <span className="rounded-xl border px-3 py-2 text-sm font-semibold tabular-nums">
              {week.label}
            </span>
            <Link
              href={`/reports?week=${Math.min(0, week.offset + 1)}`}
              aria-disabled={week.offset >= 0}
              className={`muted grid size-9 place-items-center rounded-xl border transition hover:bg-[var(--surface)] ${
                week.offset >= 0 ? "pointer-events-none opacity-40" : ""
              }`}
              aria-label={t("report.nextWeek")}
            >
              <Icon name="chevron" className="size-4 -rotate-90" />
            </Link>
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t("report.created")}
          value={totals.created}
          icon="plus"
          tone="navy"
        />
        <StatCard
          label={t("report.done")}
          value={totals.done}
          hint={`${totals.completion}%`}
          icon="check"
          tone="emerald"
        />
        <StatCard
          label={t("report.returned")}
          value={totals.returned}
          icon="arrow"
          tone="gold"
        />
        <StatCard
          label={t("report.overdue")}
          value={totals.overdue}
          icon="alert"
          tone="rose"
        />
      </div>

      <Panel title={t("report.byPerson")} className="mb-5">
        {active.length === 0 ? (
          <p className="muted px-5 py-10 text-center text-sm">
            {t("report.nobody")}
          </p>
        ) : (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="muted border-b text-left text-xs">
                <tr>
                  <th className="px-5 py-3 font-semibold">
                    {t("report.person")}
                  </th>
                  <th className="px-3 py-3 text-right font-semibold">
                    {t("report.colGiven")}
                  </th>
                  <th className="px-3 py-3 text-right font-semibold">
                    {t("report.colReceived")}
                  </th>
                  <th className="px-3 py-3 text-right font-semibold">
                    {t("report.colSubmitted")}
                  </th>
                  <th className="px-3 py-3 text-right font-semibold">
                    {t("report.colDone")}
                  </th>
                  <th className="px-3 py-3 text-right font-semibold">
                    {t("report.colReturned")}
                  </th>
                  <th className="px-3 py-3 text-right font-semibold">
                    {t("report.colOverdue")}
                  </th>
                  <th className="px-5 py-3 text-right font-semibold">
                    {t("report.colMessages")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {active.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-medium">{row.full_name}</p>
                      <p className="muted text-xs">
                        {t(`role.${row.role}` as MessageKey)}
                        {row.department
                          ? ` · ${t(`dept.${row.department}` as MessageKey).split(" — ")[0]}`
                          : ""}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {row.given || "—"}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {row.received || "—"}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {row.submitted || "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {row.done || "—"}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {row.returned > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          {row.returned}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {row.overdue > 0 ? (
                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                          {row.overdue}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="muted px-5 py-3 text-right tabular-nums">
                      {row.messages || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
        <Panel title={t("report.completion")}>
          <div className="px-5 py-4">
            <p className="mb-2 flex items-baseline justify-between">
              <span className="text-3xl font-bold tabular-nums">
                {totals.completion}%
              </span>
              <span className="muted text-xs">
                {totals.done} / {totals.created}
              </span>
            </p>
            <ProgressBar value={totals.completion} tone="bg-emerald-500" />
            <p className="muted mt-3 text-xs">
              {t("report.activeStaff")}: {totals.active} · {t("report.messages")}
              : {totals.messages}
            </p>
          </div>
        </Panel>

        {/* Naming who moved nothing is the point of a weekly review. */}
        <Panel title={t("report.idle")}>
          {idle.length === 0 ? (
            <p className="muted px-5 py-6 text-sm">{t("report.everyoneWorked")}</p>
          ) : (
            <ul className="divide-y">
              {idle.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center gap-3 px-5 py-2.5 text-sm"
                >
                  <span className="font-medium">{row.full_name}</span>
                  <Badge className="ml-auto bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/30">
                    {t(`role.${row.role}` as MessageKey)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
