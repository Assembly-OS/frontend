import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/crm-access";
import { companies } from "@/lib/crm";
import { assignableUsers } from "@/lib/queries";
import { MeetingForm } from "./meeting-form";

export const dynamic = "force-dynamic";

export default async function NewMeetingPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>;
}) {
  const user = await requireUser();
  if (!canWrite(user)) redirect("/meetings");
  const preset = Number((await searchParams).company);

  const companyOptions = await companies();
  return (
    <MeetingForm
      companies={companyOptions.map((company) => ({
        id: company.id,
        name: company.name,
      }))}
      staff={(await assignableUsers(user)).map((person) => ({
        id: person.id,
        full_name: person.full_name,
      }))}
      presetCompany={Number.isInteger(preset) && preset > 0 ? preset : null}
    />
  );
}
