import { redirect } from "next/navigation";
import { createTranslator } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { assignableUsers, assignedTasks, projects } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { isManager, type User } from "@/lib/types";
import { AssignForm, SentTasks, type Candidate } from "./assign-client";

/**
 * Which tab a person appears under in the assignment form.
 *
 * The order of the tests is the whole of it, and the last line used to be
 * `candidate.department ?? "TEAM"` — anyone with no department fell into "My
 * team". Most of the Assembly had no department, and the chairman has none by
 * design, so the form offered the chairman under "my team" while the team page
 * beside it was empty. Two answers to one question: the page builds the team
 * from `manager_id`, the form built it from a fallback.
 *
 * Now there is one source, the `manager_id` on the staff card, and nothing
 * falls through into it. The chairman is no longer offered at all — he
 * receives no work, see `assignableUsers` — so "leadership" is one's own
 * manager: handing work upward is a real thing to do here and should be a
 * deliberate tap on a tab that says so, not an accident of a missing field.
 * The RAIS test stays as a guard in case the list is ever widened again.
 * Somebody who is neither mine nor leadership and still has no department is
 * a data defect, and gets a tab that says that rather than being quietly filed
 * under my team.
 */
function groupOf(candidate: User, me: User): string {
  if (candidate.role === "RAIS" || candidate.id === me.manager_id)
    return "LEADERSHIP";
  if (candidate.manager_id === me.id) return "TEAM";
  if (candidate.role === "UYUSHMA_RAISI") return "UYUSHMA";
  if (candidate.role === "LOYIHA_RAHBARI") return "LOYIHA";
  return candidate.department ?? "NO_DEPT";
}

export default async function AssignPage() {
  const user = await requireUser();
  if (!isManager(user.role)) redirect("/dashboard");

  const locale = await currentLocale(user);
  const t = createTranslator(locale);

  const candidates: Candidate[] = (await assignableUsers(user)).map((candidate) => ({
    id: candidate.id,
    login: candidate.login,
    full_name: candidate.full_name,
    role: candidate.role,
    position: candidate.position,
    group: groupOf(candidate, user),
  }));

  const sent = await assignedTasks(user.id);
  const projectOptions = (await projects()).map((project) => ({
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
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <AssignForm candidates={candidates} projects={projectOptions} />

        <div>
          <h2 className="mb-3 text-sm font-semibold">{t("tasks.sentByMe")}</h2>
          <SentTasks tasks={sent} />
        </div>
      </div>
    </>
  );
}
