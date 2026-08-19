import { redirect } from "next/navigation";
import { createTranslator, type MessageKey } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { teamStats } from "@/lib/queries";
import { EmptyState, IconButton, PageHeader, ProgressBar } from "@/components/ui";
import { initials, percent } from "@/lib/format";
import { isManager } from "@/lib/types";

export default async function TeamPage() {
  const user = await requireUser();
  if (!isManager(user.role)) redirect("/dashboard");

  const locale = await currentLocale(user);
  const t = createTranslator(locale);
  const team = await teamStats(user.id);

  return (
    <>
      <PageHeader title={t("team.title")} description={t("team.desc")} />

      {team.length === 0 ? (
        <EmptyState text={t("team.noTeam")} />
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 xl:grid-cols-3">
          {team.map((member) => {
            const rate = percent(member.done, member.total);
            return (
              <article key={member.id} className="panel p-4">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-navy-900 text-[11px] font-bold text-white dark:bg-navy-700"
                  >
                    {initials(member.full_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {member.full_name}
                    </p>
                    {/* Role and login on one quiet line. The position used to
                        share it and was the thing that got truncated away. */}
                    <p className="muted truncate text-xs">
                      {t(`role.${member.role}` as MessageKey)}
                      {member.position ? ` · ${member.position}` : ""}
                    </p>
                  </div>
                  <IconButton
                    href={`/chat/${member.login}`}
                    icon="chat"
                    label={t("chat.start")}
                  />
                </div>

                {/* Three numbers on one line, no boxes. The grey tiles they
                    used to sit in tripled the card's chrome to carry a zero. */}
                <dl className="mt-4 flex items-baseline gap-5 border-t pt-3">
                  <div className="min-w-0">
                    <dd className="text-lg font-bold leading-none tabular-nums">
                      {member.active}
                    </dd>
                    <dt className="muted mt-1 text-[11px]">
                      {t("stats.active")}
                    </dt>
                  </div>
                  <div className="min-w-0">
                    <dd className="text-lg font-bold leading-none tabular-nums">
                      {member.done}
                    </dd>
                    <dt className="muted mt-1 text-[11px]">{t("stats.done")}</dt>
                  </div>
                  <div className="min-w-0">
                    <dd
                      className={`text-lg font-bold leading-none tabular-nums ${
                        member.overdue > 0
                          ? "text-rose-600 dark:text-rose-400"
                          : ""
                      }`}
                    >
                      {member.overdue}
                    </dd>
                    <dt className="muted mt-1 text-[11px]">
                      {t("dashboard.overdue")}
                    </dt>
                  </div>
                  <div className="ml-auto min-w-0 text-right">
                    <dd className="text-lg font-bold leading-none tabular-nums">
                      {rate}%
                    </dd>
                    <dt className="muted mt-1 text-[11px]">{t("team.load")}</dt>
                  </div>
                </dl>

                {/* Only drawn when there is load to show — a 0% bar is a grey
                    line that says nothing. */}
                {member.total > 0 && (
                  <div className="mt-3">
                    <ProgressBar
                      value={rate}
                      tone={rate >= 60 ? "bg-emerald-500" : "bg-navy-600"}
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
