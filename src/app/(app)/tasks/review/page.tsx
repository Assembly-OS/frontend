import { createTranslator } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { reviewTasks } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { TaskList } from "@/components/task-list";
import { isManager } from "@/lib/types";
import { redirect } from "next/navigation";

export default async function ReviewPage() {
  const user = await requireUser();
  const tasks = await reviewTasks(user.id);
  // Managers always have this page. Anybody else reaches it only while a stage
  // of a chain actually names them as its reviewer — `reviewTasks` scopes to
  // exactly that, and the transition itself is authorised server-side, so this
  // is a route becoming reachable rather than a permission being widened.
  if (!isManager(user.role) && tasks.length === 0) redirect("/dashboard");

  const locale = await currentLocale(user);
  const t = createTranslator(locale);

  return (
    <>
      <PageHeader
        title={t("tasks.review.title")}
        description={t("tasks.review.desc")}
        action={
          <span className="panel px-3.5 py-2 text-sm font-semibold">
            {tasks.length} {t("common.count")}
          </span>
        }
      />
      <TaskList
        tasks={tasks}
        variant="review"
        emptyText={t("tasks.empty.review")}
      />
    </>
  );
}
