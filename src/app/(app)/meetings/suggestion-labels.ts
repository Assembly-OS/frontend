import type { MessageKey } from "@/lib/i18n";
import type { SuggestedField } from "@/lib/meeting-fields";

/**
 * The label of each field the AI can propose, as the form shows it. Shared by
 * the form and the meeting page, and checked against every dictionary by the
 * strings test — these keys are looked up at run time.
 */
export const SUGGESTION_LABEL: Record<SuggestedField, MessageKey> = {
  held_at: "meeting.field.held_at",
  place: "crm.place",
  company_id: "meeting.field.company",
  legal_status: "meeting.field.legal_status",
  project_ids: "meeting.field.projects",
  description: "meeting.field.discussed",
  agreed: "meeting.field.agreed",
  open_issues: "meeting.field.open_issues",
  next_steps: "meeting.field.next_step",
  responsible_id: "meeting.field.responsible",
  participants: "meeting.field.external",
  staff_ids: "meeting.field.staff",
};
