import { createTranslator } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { overdueReceived, overdueSent } from "@/lib/queries";
import { EmptyState, PageHeader } from "@/components/ui";
import { TaskList } from "@/components/task-list";
import { isManager, receivesTasks } from "@/lib/types";

/**
 * Everything that is past its deadline and still open — the page behind the
 * "overdue" counter on the dashboard. Both sides are shown, because the two
 * roles mean different things by "late": work I owe someone, and work my
 * people owe me.
 */
export default async function OverduePage() {
  const user = await requireUser();
  const locale = await currentLocale(user);
  const t = createTranslator(locale);

  const received = receivesTasks(user.role) ? overdueReceived(user.id) : [];
  const sent = isManager(user.role) ? overdueSent(user.id) : [];
  const total = received.length + sent.length;

  return (
    <>
      <PageHeader
        title={t("tasks.overdue.title")}
        description={t("tasks.overdue.desc")}
        action={
          <span
            className={`panel px-3.5 py-2 text-sm font-semibold ${
              total > 0 ? "text-rose-600 dark:text-rose-400" : ""
            }`}
          >
            {total} {t("common.count")}
          </span>
        }
      />

      {total === 0 ? (
        <EmptyState text={t("tasks.empty.overdue")} />
      ) : (
        <div className="space-y-8">
          {received.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold">
                {t("tasks.overdue.mine")}
                <span className="muted ml-2 font-normal">
                  {received.length}
                </span>
              </h2>
              <TaskList
                tasks={received}
                variant="overdue"
                emptyText={t("tasks.empty.overdue")}
                filterable={false}
              />
            </section>
          )}

          {sent.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold">
                {t("tasks.overdue.sent")}
                <span className="muted ml-2 font-normal">{sent.length}</span>
              </h2>
              <TaskList
                tasks={sent}
                variant="sent"
                emptyText={t("tasks.empty.overdue")}
                filterable={false}
              />
            </section>
          )}
        </div>
      )}
    </>
  );
}
