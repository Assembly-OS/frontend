import Link from "next/link";
import { redirect } from "next/navigation";
import { createTranslator, type MessageKey } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { teamStats } from "@/lib/queries";
import { EmptyState, PageHeader, ProgressBar } from "@/components/ui";
import { Icon } from "@/components/icons";
import { initials, percent } from "@/lib/format";
import { isManager } from "@/lib/types";

export default async function TeamPage() {
  const user = await requireUser();
  if (!isManager(user.role)) redirect("/dashboard");

  const locale = await currentLocale(user);
  const t = createTranslator(locale);
  const team = teamStats(user.id);

  return (
    <>
      <PageHeader title={t("team.title")} description={t("team.desc")} />

      {team.length === 0 ? (
        <EmptyState text={t("team.noTeam")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {team.map((member) => {
            const rate = percent(member.done, member.total);
            return (
              <article key={member.id} className="panel p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-navy-900 text-xs font-bold text-white dark:bg-navy-700">
                    {initials(member.full_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {member.full_name}
                    </p>
                    <p className="muted truncate text-xs">
                      <span className="font-mono">@{member.login}</span>
                      {member.position ? ` · ${member.position}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/chat/${member.login}`}
                    className="grid size-9 shrink-0 place-items-center rounded-xl border transition hover:bg-[var(--surface)]"
                    aria-label={t("chat.start")}
                  >
                    <Icon name="chat" className="size-4" />
                  </Link>
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-[var(--surface)] py-2">
                    <dt className="muted text-[10px] font-medium uppercase">
                      {t("stats.active")}
                    </dt>
                    <dd className="text-base font-bold">{member.active}</dd>
                  </div>
                  <div className="rounded-xl bg-[var(--surface)] py-2">
                    <dt className="muted text-[10px] font-medium uppercase">
                      {t("stats.done")}
                    </dt>
                    <dd className="text-base font-bold">{member.done}</dd>
                  </div>
                  <div
                    className={`rounded-xl py-2 ${
                      member.overdue > 0
                        ? "bg-rose-50 dark:bg-rose-500/10"
                        : "bg-[var(--surface)]"
                    }`}
                  >
                    <dt className="muted text-[10px] font-medium uppercase">
                      {t("dashboard.overdue")}
                    </dt>
                    <dd
                      className={`text-base font-bold ${
                        member.overdue > 0
                          ? "text-rose-600 dark:text-rose-400"
                          : ""
                      }`}
                    >
                      {member.overdue}
                    </dd>
                  </div>
                </dl>

                <div className="mt-3">
                  <div className="muted mb-1 flex justify-between text-[11px]">
                    <span>{t("team.load")}</span>
                    <span className="font-semibold">
                      {rate}% · {member.total}
                    </span>
                  </div>
                  <ProgressBar
                    value={rate}
                    tone={rate >= 60 ? "bg-emerald-500" : "bg-navy-600"}
                  />
                </div>

                <p className="muted mt-3 truncate text-[11px]">
                  {t(`role.${member.role}` as MessageKey)}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
