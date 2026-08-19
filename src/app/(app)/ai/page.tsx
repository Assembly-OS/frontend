import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { canSubmitToAi } from "@/lib/agents/access";
import { isConfigured } from "@/lib/agents/claude";
import { proposalsForReviewer, runsForOwner } from "@/lib/agents/orchestrator";
import { assignableUsers } from "@/lib/queries";
import { recentMeetings } from "@/lib/crm";
import { currentLocale } from "@/lib/session";
import { AiClient } from "./ai-client";

export const dynamic = "force-dynamic";

export default async function AiPage() {
  const user = await requireUser();
  if (!canSubmitToAi(user)) redirect("/dashboard");

  const locale = await currentLocale(user);
  const lang = locale === "ru" ? "ru" : locale === "en" ? "en" : "uz";

  const recent = await recentMeetings(lang, 20);
  return (
    <AiClient
      // A head sees what was drafted for their department, whoever submitted
      // the document it came from.
      proposals={await proposalsForReviewer(user.id)}
      runs={await runsForOwner(user.id)}
      staff={(await assignableUsers(user)).map((person) => ({
        id: person.id,
        login: person.login,
        full_name: person.full_name,
      }))}
      meetings={recent.map((meeting) => ({
        id: meeting.id,
        title: meeting.title,
        date: meeting.held_at ?? meeting.created_at,
        duration: meeting.duration,
        company: meeting.company_name,
        summary: meeting.summary,
        hasAudio: Boolean(meeting.audio_key),
        lang: meeting.lang,
      }))}
      llmConfigured={isConfigured()}
    />
  );
}
