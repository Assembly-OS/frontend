import { redirect } from "next/navigation";
import { createTranslator } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { executeTasks } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { TaskList } from "@/components/task-list";
import { receivesTasks } from "@/lib/types";

export default async function ExecutePage() {
  const user = await requireUser();
  if (!receivesTasks(user.role)) redirect("/dashboard");

  const locale = await currentLocale(user);
  const t = createTranslator(locale);
  const tasks = executeTasks(user.id);

  return (
    <>
      <PageHeader
        title={t("tasks.execute.title")}
        description={t("tasks.execute.desc")}
        action={
          <span className="panel px-3.5 py-2 text-sm font-semibold">
            {tasks.length} {t("common.count")}
          </span>
        }
      />
      <TaskList
        tasks={tasks}
        variant="execute"
        emptyText={t("tasks.empty.execute")}
      />
    </>
  );
}
