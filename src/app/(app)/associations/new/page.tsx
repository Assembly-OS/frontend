import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { canManageAssociations, headAccountOptions, responsibleOptions } from "@/lib/associations";
import { projectOptions } from "@/lib/project-visibility";
import { AssociationForm, EMPTY_ASSOCIATION } from "../association-form";

export const dynamic = "force-dynamic";

export default async function NewAssociationPage() {
  const user = await requireUser();
  if (!canManageAssociations(user)) redirect("/associations");
  const [responsible, heads, projects] = await Promise.all([
    responsibleOptions(),
    headAccountOptions(),
    projectOptions(user),
  ]);
  return <AssociationForm initial={EMPTY_ASSOCIATION} options={{ responsible, heads, projects }} />;
}
