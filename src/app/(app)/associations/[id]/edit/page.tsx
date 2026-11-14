import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import {
  associationCard,
  canManageAssociations,
  headAccountOptions,
  responsibleOptions,
} from "@/lib/associations";
import { projectOptions } from "@/lib/project-visibility";
import { id as parseId } from "@/lib/validate";
import { AssociationForm } from "../../association-form";

export const dynamic = "force-dynamic";

export default async function EditAssociationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canManageAssociations(user)) redirect("/associations");
  const id = parseId((await params).id);
  const card = id ? await associationCard(user, id) : undefined;
  if (!card) notFound();
  const [responsible, heads, projects] = await Promise.all([
    responsibleOptions(),
    headAccountOptions(),
    projectOptions(user),
  ]);
  return (
    <AssociationForm
      id={card.id}
      initial={{
        name: card.name,
        name_uzc: card.name_uzc ?? "",
        name_ru: card.name_ru ?? "",
        name_en: card.name_en ?? "",
        short_name: card.short_name,
        sector: card.sector,
        kontur: card.kontur ?? "",
        region: card.region,
        responsible_user_id: card.responsible_user_id,
        head_user_id: card.head_user_id,
        head_name: card.head_name ?? "",
        head_position: card.head_position ?? "",
        head_contact: card.head_contact ?? "",
        members_count: card.members_count,
        status: card.status,
        project_ids: card.projectList.map((project) => project.id),
      }}
      options={{ responsible, heads, projects }}
    />
  );
}
