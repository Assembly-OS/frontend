import { notFound, redirect } from "next/navigation";
import { currentLocale, requireUser } from "@/lib/session";
import { canManageProjects } from "@/lib/project-access";
import { clusters, projectById } from "@/lib/project-threads";
import { clusterName } from "@/lib/project-passport";
import { all } from "@/lib/pg";
import { id as parseId } from "@/lib/validate";
import { PassportForm } from "./passport-form";

export const dynamic = "force-dynamic";

const text = (value: string | null | undefined) => value ?? "";
const number = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : String(value);

export default async function PassportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const projectId = parseId((await params).id);
  const project = projectId ? await projectById(projectId) : undefined;
  if (!project) notFound();
  // The same managers the API lets save it.
  if (!canManageProjects(user)) redirect(`/projects/${project.id}`);

  const locale = await currentLocale(user);
  const [clusterRows, people] = await Promise.all([
    clusters(),
    all<{ id: number; full_name: string; position: string | null }>(
      "SELECT id, full_name, position FROM users WHERE is_active = 1 ORDER BY full_name",
    ),
  ]);

  return (
    <PassportForm
      projectId={project.id}
      clusters={clusterRows.map((row) => ({
        id: row.id,
        label:
          clusterName(locale, { uz: row.name_uz, uzc: row.name_uzc, ru: row.name_ru, en: row.name_en }) ??
          row.code,
      }))}
      people={people.map((person) => ({
        id: person.id,
        label: person.full_name,
        hint: person.position,
      }))}
      initial={{
        name: project.name,
        name_ru: text(project.name_ru),
        name_en: text(project.name_en),
        description: text(project.description),
        description_ru: text(project.description_ru),
        description_en: text(project.description_en),
        klaster_id: project.klaster_id,
        tier: text(project.tier),
        phase: text(project.phase),
        priority: project.priority,
        stage: text(project.stage),
        owner_id: project.owner_id,
        leader_name: text(project.leader_name),
        deputy_id: project.deputy_id,
        deputy_name: text(project.deputy_name),
        ppp_state: number(project.ppp_state),
        ppp_public: number(project.ppp_public),
        ppp_private: number(project.ppp_private),
        ppp_state_party: text(project.ppp_state_party),
        ppp_public_party: text(project.ppp_public_party),
        ppp_private_party: text(project.ppp_private_party),
        started_at: text(project.started_at),
        deadline: text(project.deadline),
        next_decision_on: text(project.next_decision_on),
        budget: number(project.budget),
        first_result: text(project.first_result),
      }}
    />
  );
}
