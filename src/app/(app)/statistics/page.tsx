import { redirect } from "next/navigation";
import Link from "next/link";
import { createTranslator, type MessageKey } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import {
  orgTotals,
  projects,
  taskStatusBreakdown,
  uyushmaStats,
} from "@/lib/queries";
import { PageHeader, Panel, ProgressBar, StatCard } from "@/components/ui";
import { formatDate, formatMoney, formatNumber, percent } from "@/lib/format";
import { isManager, statusTone, TASK_STATUSES } from "@/lib/types";
import { UyushmaTable } from "./uyushma-table";

const STATUS_BAR: Record<string, string> = {
  YANGI: "bg-sky-500",
  QABUL_QILINDI: "bg-indigo-500",
  BAJARILMOQDA: "bg-amber-500",
  TEKSHIRUVDA: "bg-violet-500",
  BAJARILDI: "bg-emerald-500",
  QAYTARILDI: "bg-orange-500",
  RAD_ETILDI: "bg-rose-500",
};

export default async function StatisticsPage() {
  const user = await requireUser();
  if (!isManager(user.role)) redirect("/dashboard");

  const locale = await currentLocale(user);
  const t = createTranslator(locale);

  const rows = uyushmaStats();
  const totals = orgTotals();
  const breakdown = taskStatusBreakdown();
  const totalTasks = breakdown.reduce((sum, slice) => sum + slice.count, 0);
  const projectRows = projects();

  const avgRate = Math.round(
    rows.reduce((sum, row) => sum + percent(row.tasks_done, row.tasks_total), 0) /
      (rows.length || 1),
  );

  return (
    <>
      <PageHeader title={t("stats.title")} description={t("stats.desc")} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label={t("stats.totalUyushma")}
          value={rows.length}
          icon="chart"
          tone="navy"
        />
        <StatCard
          label={t("stats.totalMembers")}
          value={formatNumber(totals.members)}
          icon="users"
          tone="gold"
        />
        <StatCard
          label={t("stats.totalProjects")}
          value={totals.loyihalar}
          hint={`${formatMoney(totals.budget, t)} ${t("stats.sum")}`}
          icon="send"
          tone="emerald"
        />
        <StatCard
          label={t("stats.avgRate")}
          value={`${avgRate}%`}
          hint={`${t("dashboard.overdue")}: ${totals.overdue}`}
          icon="check"
          tone={avgRate >= 50 ? "emerald" : "slate"}
        />
      </div>

      {/* Status mix across the whole platform */}
      <Panel title={t("stats.byStatus")} className="mt-6">
        <div className="p-5">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--surface)]">
            {TASK_STATUSES.map((status) => {
              const slice = breakdown.find((item) => item.status === status);
              if (!slice?.count) return null;
              return (
                <div
                  key={status}
                  className={STATUS_BAR[status]}
                  style={{ width: `${(slice.count / totalTasks) * 100}%` }}
                  title={`${t(`status.${status}` as MessageKey)}: ${slice.count}`}
                />
              );
            })}
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            {TASK_STATUSES.map((status) => {
              const slice = breakdown.find((item) => item.status === status);
              if (!slice?.count) return null;
              return (
                <li key={status} className="flex items-center gap-2 text-xs">
                  <span
                    className={`size-2.5 rounded-full ${STATUS_BAR[status]}`}
                  />
                  <span className="muted">
                    {t(`status.${status}` as MessageKey)}
                  </span>
                  <span className="font-semibold">{slice.count}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </Panel>

      <h2 className="mb-3 mt-8 text-sm font-semibold">{t("stats.uyushma")}</h2>
      <UyushmaTable rows={rows} />

      <h2 className="mb-3 mt-8 text-sm font-semibold">
        {t("dashboard.projects")}
      </h2>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projectRows.map((project) => (
          <article key={project.id} className="panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="muted font-mono text-[11px] font-semibold">
                  {project.code}
                </p>
                <h3 className="truncate text-sm font-semibold">{project.name}</h3>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${statusTone(
                  project.status === "FAOL" ? "BAJARILMOQDA" : "TEKSHIRUVDA",
                )}`}
              >
                {project.progress}%
              </span>
            </div>
            <div className="mt-3">
              <ProgressBar
                value={project.progress}
                tone={project.progress >= 60 ? "bg-emerald-500" : "bg-navy-600"}
              />
            </div>
            <dl className="muted mt-3 space-y-1 text-xs">
              <div className="flex justify-between gap-2">
                <dt>{t("stats.head")}</dt>
                <dd className="truncate font-medium">
                  {project.owner_login ? (
                    <Link
                      href={`/chat/${project.owner_login}`}
                      className="hover:underline"
                    >
                      {project.owner_name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>{t("stats.budget")}</dt>
                <dd className="font-medium">
                  {formatMoney(project.budget, t)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>{t("tasks.deadline")}</dt>
                <dd className="font-medium">{formatDate(project.deadline)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </>
  );
}
