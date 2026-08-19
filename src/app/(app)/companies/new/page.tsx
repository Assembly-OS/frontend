import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/crm-access";
import { assignableUsers } from "@/lib/queries";
import { CompanyForm } from "./company-form";

export const dynamic = "force-dynamic";

export default async function NewCompanyPage() {
  const user = await requireUser();
  if (!canWrite(user)) redirect("/companies");
  return (
    <CompanyForm
      staff={(await assignableUsers(user)).map((person) => ({
        id: person.id,
        full_name: person.full_name,
      }))}
      defaultOwner={user.id}
    />
  );
}
