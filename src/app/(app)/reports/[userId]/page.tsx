import { notFound, redirect } from "next/navigation";
import { createTranslator, type MessageKey } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { seesWorkOf } from "@/lib/oversight";
import { completedTasks, userById } from "@/lib/queries";
import { monthBounds, weekBounds } from "@/lib/reports";
import { isManager } from "@/lib/types";
import { Button, EmptyState, PageHeader } from "@/components/ui";
import { TaskList } from "@/components/task-list";
import { reportPeriod } from "../period";

export const dynamic = "force-dynamic";

/**
 * What one person finished in the stretch the report was showing — the tasks
 * behind their "done" figure, opened by clicking their name.
 */
export default async function PersonReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ week?: string; period?: string }>;
}) {
  const user = await requireUser();
  if (!isManager(user.role)) redirect("/dashboard");

  const { userId } = await params;
  const id = Number(userId);
  const person = Number.isInteger(id) ? await userById(id) : undefined;
  if (!person) notFound();

  const { period, offset } = reportPeriod(await searchParams);
  const back = `/reports?period=${period}&week=${offset}`;
  // Not a 404: the person exists, this viewer just may not read their titles.
  if (!seesWorkOf(user, person)) redirect(back);

  const bounds = period === "month" ? monthBounds(offset) : weekBounds(offset);
  const [tasks, locale] = await Promise.all([
    completedTasks(person.id, bounds.from, bounds.to),
    currentLocale(user),
  ]);
  const t = createTranslator(locale);

  const role = t(`role.${person.role}` as MessageKey);
  const department = person.department
    ? ` · ${t(`dept.${person.department}` as MessageKey).split(" — ")[0]}`
    : "";

  return (
    <>
      <PageHeader
        title={person.full_name}
        description={`${role}${department} — ${t("report.completedTitle")}, ${bounds.label}`}
        action={
          <div className="flex items-center gap-2">
            <span className="panel px-3.5 py-2 text-sm font-semibold tabular-nums">
              {tasks.length} {t("common.count")}
            </span>
            <Button variant="secondary" href={back}>
              {t("report.back")}
            </Button>
          </div>
        }
      />

      {tasks.length === 0 ? (
        <EmptyState
          icon="check"
          text={t("report.completedEmpty")}
          hint={t("report.completedEmptyHint")}
        />
      ) : (
        <TaskList
          tasks={tasks}
          variant="report"
          emptyText={t("report.completedEmpty")}
          filterable={false}
        />
      )}
    </>
  );
}
