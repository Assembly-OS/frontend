import { notFound, redirect } from "next/navigation";
import { currentLocale, requireUser } from "@/lib/session";
import { canManageProjects } from "@/lib/project-access";
import { projectById } from "@/lib/project-threads";
import { projectRights } from "@/lib/project-visibility";
import { stagesOf } from "@/lib/project-stages";
import { inLocale } from "@/lib/project-passport";
import { today } from "@/lib/crm";
import { id as parseId } from "@/lib/validate";
import { StagesForm } from "./stages-form";

export const dynamic = "force-dynamic";

export default async function StagesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const projectId = parseId((await params).id);
  const rights = projectId ? await projectRights(user, projectId) : null;
  const project = rights ? await projectById(rights.id) : undefined;
  if (!rights || !project) notFound();

  // The same people the API lets save it (TZ 4.2's stage row, and this
  // project's own leader and deputy); answering help is the staff's side.
  if (!rights.enterStages) redirect(`/projects/${project.id}`);
  const manager = canManageProjects(user) && rights.internal;

  const locale = await currentLocale(user);
  const stages = await stagesOf(project.id);

  return (
    <StagesForm
      projectId={project.id}
      projectName={inLocale(locale, project.name, project.name_ru, project.name_en) ?? project.name}
      today={today()}
      mayAnswer={manager}
      initial={stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        plan_start: stage.plan_start,
        plan_end: stage.plan_end,
        fact_start: stage.fact_start ?? "",
        fact_end: stage.fact_end ?? "",
        progress: String(stage.progress),
        delay_reason: stage.delay_reason ?? "",
        help_needed: stage.help_needed ?? "",
        help_status: stage.help_status ?? "",
      }))}
    />
  );
}
