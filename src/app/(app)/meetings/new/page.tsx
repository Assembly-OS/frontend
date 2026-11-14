import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/crm-access";
import { mayRecordMeeting } from "@/lib/meeting-visibility";
import { meetingFormOptions } from "@/lib/meetings";
import { isExternal, receivesTasks } from "@/lib/types";
import { MeetingForm } from "./meeting-form";

export const dynamic = "force-dynamic";

export default async function NewMeetingPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; project?: string; uyushma?: string }>;
}) {
  const user = await requireUser();
  if (!mayRecordMeeting(user)) redirect("/meetings");

  const query = await searchParams;
  const preset = (value?: string) => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
  };
  const project = preset(query.project);

  return (
    <MeetingForm
      mode="create"
      {...(await meetingFormOptions(user))}
      aiTools={canWrite(user)}
      initial={{
        title: "",
        held_at: "",
        company_id: preset(query.company),
        legal_status: "",
        // Someone from an association files for his own association; the
        // staff arrive from the association's card with it already chosen.
        uyushma_id: isExternal(user.role) ? user.uyushma_id : preset(query.uyushma),
        place: "",
        participants: "",
        description: "",
        agreed: "",
        open_issues: "",
        next_steps: "",
        // Whoever files the meeting answers for its next step unless they name
        // somebody else — except the chairman, who receives no assignments.
        responsible_id: receivesTasks(user.role) ? user.id : null,
        transcript: "",
        project_ids: project ? [project] : [],
        // The person filing it was usually there.
        staff_ids: isExternal(user.role) ? [] : [user.id],
      }}
    />
  );
}
