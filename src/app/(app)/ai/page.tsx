import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { canSubmitToAi } from "@/lib/agents/access";
import { isConfigured } from "@/lib/agents/claude";
import { proposalsFor, runsForOwner } from "@/lib/agents/orchestrator";
import { seesEverything } from "@/lib/oversight";
import { aiSettings } from "@/lib/settings";
import { id as parseId, str } from "@/lib/validate";
import { assignableUsers } from "@/lib/queries";
import { recentMeetings } from "@/lib/crm";
import { currentLocale } from "@/lib/session";
import { AiClient } from "./ai-client";

export const dynamic = "force-dynamic";

type Filters = { status?: string; severity?: string; assignee?: string; from?: string; to?: string; page?: string };

export default async function AiPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const user = await requireUser();
  if (!canSubmitToAi(user)) redirect("/dashboard");
  const q = await searchParams;
  const day = (value?: string) => {
    const text = str(value, 10);
    return text && /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
  };
  // TZ 7.1: the queue is filtered and paged here, not in the browser.
  const filter = {
    status: str(q.status, 20),
    severity: str(q.severity, 2),
    assigneeId: parseId(q.assignee),
    from: day(q.from),
    to: day(q.to),
    page: Number(q.page) || 1,
  };
  const queue = await proposalsFor(user.id, filter);

  const locale = await currentLocale(user);
  const lang = locale === "ru" ? "ru" : locale === "en" ? "en" : "uz";

  const recent = await recentMeetings(lang, 20);
  return (
    <AiClient
      // A head sees what was drafted for their department, whoever submitted
      // the document it came from.
      proposals={queue.rows}
      queue={{
        filter: { ...filter, assignee: filter.assigneeId ? String(filter.assigneeId) : null },
        total: queue.total,
        page: queue.page,
        pages: queue.pages,
        settings: seesEverything(user) ? await aiSettings() : null,
      }}
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
