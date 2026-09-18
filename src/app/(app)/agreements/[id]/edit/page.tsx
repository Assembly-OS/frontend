import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { canWrite, crmRole } from "@/lib/crm-access";
import { kelishuvById } from "@/lib/kelishuvlar";
import { meetingFormOptions } from "@/lib/meetings";
import { id as parseId } from "@/lib/validate";
import { KelishuvForm } from "../../kelishuv-form";

export const dynamic = "force-dynamic";

export default async function EditKelishuvPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const id = parseId((await params).id);
  const kelishuv = id ? await kelishuvById(id) : undefined;
  if (!kelishuv) notFound();

  // The same three the API lets through.
  const mayEdit =
    canWrite(user) &&
    (kelishuv.created_by === user.id ||
      kelishuv.responsible_id === user.id ||
      crmRole(user) === "admin");
  if (!mayEdit) redirect(`/agreements/${kelishuv.id}`);

  const options = await meetingFormOptions(user);

  return (
    <KelishuvForm
      mode="edit"
      kelishuvId={kelishuv.id}
      companies={options.companies}
      people={options.people}
      projects={options.projects}
      initial={{
        title: kelishuv.title,
        kind: kelishuv.kind ?? "",
        content: kelishuv.content ?? "",
        loyiha_id: kelishuv.loyiha_id,
        meeting: kelishuv.meeting_id
          ? { id: kelishuv.meeting_id, title: kelishuv.meeting_title ?? "" }
          : null,
        amount: kelishuv.amount === null ? "" : String(kelishuv.amount),
        currency: kelishuv.currency ?? "UZS",
        signed_on: kelishuv.signed_on ?? "",
        valid_until: kelishuv.valid_until ?? "",
        responsible_id: kelishuv.responsible_id,
        status: kelishuv.status,
        party_ids: kelishuv.parties.map((party) => party.id),
        obligations: kelishuv.obligations.map((row) => ({
          id: row.id,
          description: row.description,
          owner_user_id: row.owner_user_id ? String(row.owner_user_id) : "",
          owner_name: row.owner_name ?? "",
          deadline: row.deadline ?? "",
        })),
      }}
    />
  );
}
