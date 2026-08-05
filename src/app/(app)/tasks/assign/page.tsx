import { redirect } from "next/navigation";
import { createTranslator } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { assignableUsers, assignedTasks, projects } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { isManager, type User } from "@/lib/types";
import { AssignForm, SentTasks, type Candidate } from "./assign-client";

function groupOf(candidate: User, meId: number): string {
  if (candidate.manager_id === meId) return "TEAM";
  if (candidate.role === "UYUSHMA_RAISI") return "UYUSHMA";
  if (candidate.role === "LOYIHA_RAHBARI") return "LOYIHA";
  return candidate.department ?? "TEAM";
}

export default async function AssignPage() {
  const user = await requireUser();
  if (!isManager(user.role)) redirect("/dashboard");

  const locale = await currentLocale(user);
  const t = createTranslator(locale);

  const candidates: Candidate[] = assignableUsers(user).map((candidate) => ({
    id: candidate.id,
    login: candidate.login,
    full_name: candidate.full_name,
    role: candidate.role,
    position: candidate.position,
    group: groupOf(candidate, user.id),
  }));

  const sent = assignedTasks(user.id);
  const projectOptions = projects().map((project) => ({
    id: project.id,
    code: project.code,
    name: project.name,
  }));

  return (
    <>
      <PageHeader
        title={t("tasks.assign.title")}
        description={t("tasks.assign.desc")}
      />

      {/* items-start: the form must keep its own height, not stretch to match
          the (much longer) list of sent assignments next to it. */}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <AssignForm candidates={candidates} projects={projectOptions} />

        <div>
          <h2 className="mb-3 text-sm font-semibold">{t("tasks.sentByMe")}</h2>
          <SentTasks tasks={sent} />
        </div>
      </div>
    </>
  );
}
