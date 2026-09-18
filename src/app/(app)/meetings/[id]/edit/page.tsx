import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { canWrite, crmRole } from "@/lib/crm-access";
import { meetingById, meetingFormOptions } from "@/lib/meetings";
import { id as parseId } from "@/lib/validate";
import { MeetingForm } from "../../new/meeting-form";

export const dynamic = "force-dynamic";

export default async function EditMeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const meetingId = parseId((await params).id);
  const meeting = meetingId ? await meetingById(meetingId) : undefined;
  if (!meeting) notFound();

  // The same people the API lets through: whoever filed it, whoever answers
  // for its next step, and the chairman's side.
  const mayEdit =
    canWrite(user) &&
    (meeting.owner_id === user.id ||
      meeting.responsible_id === user.id ||
      crmRole(user) === "admin");
  if (!mayEdit) redirect(`/meetings/${meeting.id}`);

  const options = await meetingFormOptions(user);
  // The person already answering for the next step stays on offer even when
  // the editor could not assign to them: otherwise the select would open on
  // "Choose" and a save made for another reason would quietly drop them.
  if (
    meeting.responsible_id &&
    !options.responsibles.some((person) => person.id === meeting.responsible_id)
  ) {
    options.responsibles.unshift({
      id: meeting.responsible_id,
      label: meeting.responsible_name ?? `#${meeting.responsible_id}`,
    });
  }

  return (
    <MeetingForm
      mode="edit"
      meetingId={meeting.id}
      {...options}
      suggestion={meeting.suggestion}
      initial={{
        title: meeting.title,
        held_at: meeting.held_at?.slice(0, 10) ?? "",
        company_id: meeting.company_id,
        legal_status: meeting.legal_status ?? "",
        uyushma_id: meeting.uyushma_id,
        place: meeting.place ?? "",
        participants: meeting.participants ?? "",
        description: meeting.description ?? "",
        agreed: meeting.agreed ?? "",
        open_issues: meeting.open_issues ?? "",
        next_steps: meeting.next_steps ?? "",
        responsible_id: meeting.responsible_id,
        transcript: meeting.transcript,
        project_ids: meeting.projects.map((project) => project.id),
        staff_ids: meeting.staff.map((person) => person.id),
      }}
    />
  );
}
