import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/crm-access";
import { meetingById, meetingFormOptions } from "@/lib/meetings";
import { KELISHUV_KINDS, type KelishuvKind } from "@/lib/kelishuv-fields";
import { id as parseId } from "@/lib/validate";
import { KelishuvForm } from "../kelishuv-form";

export const dynamic = "force-dynamic";

/**
 * A new agreement — from nothing, or drawn up from a meeting.
 *
 * From a meeting (`?meeting=`), the form starts from what the meeting already
 * recorded: its company as the party, its project, what it agreed as the
 * content, and the kind from its legal status where that status is a paper.
 * The meeting where the agreement was reached is its source, and retyping
 * what was said there is how records drift apart.
 */
export default async function NewKelishuvPage({
  searchParams,
}: {
  searchParams: Promise<{ meeting?: string; company?: string; project?: string }>;
}) {
  const user = await requireUser();
  if (!canWrite(user)) redirect("/agreements");

  const query = await searchParams;
  const meetingId = parseId(query.meeting);
  const meeting = meetingId ? await meetingById(meetingId) : undefined;
  const options = await meetingFormOptions(user);

  const kind =
    meeting?.legal_status && KELISHUV_KINDS.includes(meeting.legal_status as KelishuvKind)
      ? meeting.legal_status
      : "";
  const company = meeting?.company_id ?? parseId(query.company);

  return (
    <KelishuvForm
      mode="create"
      companies={options.companies}
      people={options.people}
      projects={options.projects}
      initial={{
        title: meeting?.title ?? "",
        kind,
        content: meeting?.agreed ?? "",
        loyiha_id: meeting?.projects[0]?.id ?? parseId(query.project),
        meeting: meeting ? { id: meeting.id, title: meeting.title } : null,
        amount: "",
        currency: "UZS",
        signed_on: "",
        valid_until: "",
        responsible_id: meeting?.responsible_id ?? user.id,
        status: "DRAFT",
        party_ids: company ? [company] : [],
        obligations: [],
      }}
    />
  );
}
