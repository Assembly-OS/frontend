import Link from "next/link";
import { createTranslator, type MessageKey } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import {
  counters,
  departmentStats,
  orgTotals,
  rais,
  recentTasks,
  teamStats,
  uyushmaStats,
} from "@/lib/queries";
import { Badge, PageHeader, Panel, StatCard } from "@/components/ui";
import { PieChart } from "@/components/pie-chart";
import { Icon } from "@/components/icons";
import { formatDate, formatMoney, formatNumber, initials, percent } from "@/lib/format";
import {
  isManager,
  priorityTone,
  receivesTasks,
  statusTone,
} from "@/lib/types";

export default async function DashboardPage() {
  const user = await requireUser();
  const locale = await currentLocale(user);
  const t = createTranslator(locale);

  const c = counters(user.id);
  const recent = recentTasks(user.id, 6);
  const manager = isManager(user.role);
  const receives = receivesTasks(user.role);
  const chairman = rais();

  return (
    <>
      <PageHeader
        title={`${t("dashboard.greeting")}, ${user.full_name.split(" ")[0]}`}
        description={`${t(`role.${user.role}` as MessageKey)}${
          user.position ? ` · ${user.position}` : ""
        }`}
        action={
          chairman && chairman.id !== user.id ? (
            <Link
              href={`/chat/${chairman.login}`}
              className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 dark:bg-navy-600 dark:hover:bg-navy-500"
            >
              <Icon name="chat" className="size-4" />
              {t("nav.chatRais")}
            </Link>
          ) : null
        }
      />

      {/* Personal counters — the Rais tracks what they handed out, not an inbox */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {receives ? (
          <>
            <StatCard
              label={t("dashboard.newTasks")}
              value={c.incoming}
              icon="inbox"
              tone="navy"
              href="/tasks/inbox"
            />
            <StatCard
              label={t("dashboard.inWork")}
              value={c.inWork}
              icon="play"
              tone="gold"
              href="/tasks/execute"
            />
            {manager ? (
              <StatCard
                label={t("dashboard.onReview")}
                value={c.onReview}
                icon="check"
                tone="emerald"
                href="/tasks/review"
              />
            ) : (
              <StatCard
                label={t("dashboard.completed")}
                value={c.completed}
                icon="check"
                tone="emerald"
              />
            )}
            <StatCard
              label={t("dashboard.overdue")}
              value={c.overdue}
              icon="alert"
              tone={c.overdue > 0 ? "rose" : "slate"}
              href="/tasks/overdue"
            />
          </>
        ) : (
          <>
            <StatCard
              label={t("dashboard.sent")}
              value={c.sent}
              hint={`${t("stats.active")}: ${c.sentActive}`}
              icon="send"
              tone="navy"
              href="/tasks/assign"
            />
            <StatCard
              label={t("dashboard.onReview")}
              value={c.onReview}
              icon="check"
              tone="gold"
              href="/tasks/review"
            />
            <StatCard
              label={t("dashboard.completed")}
              value={c.sentDone}
              icon="check"
              tone="emerald"
            />
            <StatCard
              label={t("dashboard.overdue")}
              value={c.sentOverdue}
              icon="alert"
              tone={c.sentOverdue > 0 ? "rose" : "slate"}
              href="/tasks/overdue"
            />
          </>
        )}
      </div>

      {/* Rais command centre */}
      {user.role === "RAIS" && <CommandCentre t={t} />}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {/* Recent activity */}
        <Panel
          title={t("dashboard.recent")}
          className="xl:col-span-2"
          action={
            <Link
              href={receives ? "/tasks/inbox" : "/tasks/assign"}
              className="muted inline-flex items-center gap-1 text-xs font-medium hover:underline"
            >
              {t("nav.tasks")}
              <Icon name="arrow" className="size-3.5" />
            </Link>
          }
        >
          {recent.length === 0 ? (
            <p className="muted px-5 py-8 text-center text-sm">
              {t("common.noData")}
            </p>
          ) : (
            <ul className="divide-y">
              {recent.map((task) => (
                <li key={task.id} className="flex items-start gap-3 px-5 py-3.5">
                  <span className="muted mt-0.5 shrink-0 font-mono text-[11px] font-semibold">
                    {task.code}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="muted mt-0.5 truncate text-xs">
                      {task.from_user_id === user.id
                        ? `${t("tasks.to")}: ${task.to_name}`
                        : `${t("tasks.from")}: ${task.from_name}`}
                      {" · "}
                      {formatDate(task.deadline)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge className={statusTone(task.status)}>
                      {t(`status.${task.status}` as MessageKey)}
                    </Badge>
                    <Badge className={priorityTone(task.priority)}>
                      {t(`priority.${task.priority}` as MessageKey)}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="min-w-0 space-y-6">
          <Panel title={t("dashboard.quickActions")}>
            <div className="grid gap-2 p-4">
              {receives && (
                <>
                  <QuickLink href="/tasks/inbox" icon="inbox" label={t("nav.inbox")} badge={c.incoming} />
                  <QuickLink href="/tasks/execute" icon="play" label={t("nav.execute")} badge={c.inWork} />
                </>
              )}
              {manager && (
                <>
                  <QuickLink href="/tasks/assign" icon="send" label={t("nav.assign")} />
                  <QuickLink href="/tasks/review" icon="check" label={t("nav.review")} badge={c.onReview} />
                </>
              )}
              <QuickLink href="/chat" icon="chat" label={t("nav.chat")} badge={c.unread} />
              {manager && (
                <QuickLink href="/statistics" icon="chart" label={t("nav.statistics")} />
              )}
            </div>
          </Panel>

          {manager && c.team > 0 && <TeamPanel userId={user.id} t={t} />}
        </div>
      </div>
    </>
  );
}

function QuickLink({
  href,
  icon,
  label,
  badge,
}: {
  href: string;
  icon: "inbox" | "play" | "send" | "check" | "chat" | "chart";
  label: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition hover:bg-[var(--surface)]"
    >
      <Icon name={icon} className="size-4" />
      <span className="flex-1 truncate">{label}</span>
      {!!badge && (
        <span className="min-w-5 rounded-full bg-navy-900 px-1.5 text-center text-[11px] font-bold text-white dark:bg-navy-600">
          {badge}
        </span>
      )}
      <Icon name="arrow" className="muted size-3.5" />
    </Link>
  );
}

function TeamPanel({
  userId,
  t,
}: {
  userId: number;
  t: (key: MessageKey) => string;
}) {
  const team = teamStats(userId).slice(0, 6);
  return (
    <Panel
      title={t("dashboard.myTeam")}
      action={
        <Link href="/team" className="muted text-xs font-medium hover:underline">
          {t("action.details")}
        </Link>
      }
    >
      <PieChart
        stacked
        totalLabel={t("stats.tasks")}
        emptyText={t("common.noData")}
        otherLabel={t("common.other")}
        slices={team.map((member) => ({
          key: String(member.id),
          code: initials(member.full_name),
          label: member.full_name,
          hint: `${t("stats.active")}: ${member.active} · ${t(
            "stats.rate",
          )} ${percent(member.done, member.total)}%`,
          value: member.total,
        }))}
      />
    </Panel>
  );
}

function CommandCentre({ t }: { t: (key: MessageKey) => string }) {
  const totals = orgTotals();
  const depts = departmentStats();
  const top = [...uyushmaStats()]
    .sort((a, b) => b.tasks_total - a.tasks_total)
    .slice(0, 5);

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <Icon name="chart" className="size-4" />
        <h2 className="text-sm font-semibold">{t("dashboard.command")}</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label={t("dashboard.allTasks")}
          value={totals.tasks}
          hint={`${t("dashboard.completed")}: ${totals.done}`}
          icon="grid"
          tone="navy"
        />
        <StatCard
          label={t("dashboard.activeUsers")}
          value={totals.users}
          icon="users"
          tone="slate"
        />
        <StatCard
          label={t("dashboard.uyushmalar")}
          value={totals.uyushmalar}
          hint={`${formatNumber(totals.members)} ${t("stats.members")}`}
          icon="chart"
          tone="gold"
          href="/statistics"
        />
        <StatCard
          label={t("dashboard.projects")}
          value={totals.loyihalar}
          hint={`${formatMoney(totals.budget, t)} ${t("stats.sum")}`}
          icon="send"
          tone="emerald"
          href="/statistics"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title={t("dashboard.byDepartment")}>
          <PieChart
            totalLabel={t("dashboard.allTasks")}
            emptyText={t("common.noData")}
            slices={depts.map((dept) => ({
              key: dept.department,
              code: t(`dept.${dept.department}` as MessageKey).split(" — ")[0],
              label: t(`dept.${dept.department}` as MessageKey),
              hint: dept.head_name,
              value: dept.total,
            }))}
          />
        </Panel>

        <Panel
          title={t("stats.top")}
          action={
            <Link
              href="/statistics"
              className="muted text-xs font-medium hover:underline"
            >
              {t("action.details")}
            </Link>
          }
        >
          <PieChart
            totalLabel={t("stats.tasks")}
            emptyText={t("common.noData")}
            otherLabel={t("common.other")}
            slices={top.map((uyushma) => ({
              key: String(uyushma.id),
              code: uyushma.short_name.split(" ")[0].slice(0, 4).toUpperCase(),
              label: uyushma.name,
              hint: `${uyushma.region} · ${t("stats.rate")} ${percent(
                uyushma.tasks_done,
                uyushma.tasks_total,
              )}%`,
              value: uyushma.tasks_total,
            }))}
          />
        </Panel>
      </div>
    </section>
  );
}
