import { requireUser } from "@/lib/session";
import { isConfigured } from "@/lib/agents/claude";
import { chatHistory } from "@/lib/agents/assistant-history";
import { suggestedQuestions } from "@/lib/knowledge/suggest";
import { AssistantClient } from "./assistant-client";

export const dynamic = "force-dynamic";

/**
 * Open to every member of staff. The assistant only reads what the person
 * could already open by clicking, and answering "when did we last talk to X"
 * is exactly the kind of question that otherwise costs somebody an interruption.
 *
 * The conversation is loaded here rather than fetched by the browser, so the
 * page arrives with the history already in it — no flash of an empty chat on
 * every refresh. The suggested questions are drawn from this person's own
 * data, so each one has an answer.
 */
export default async function AssistantPage() {
  const user = await requireUser();
  const [history, suggestions] = await Promise.all([
    chatHistory(user.id),
    suggestedQuestions(user),
  ]);
  return (
    <AssistantClient
      llmConfigured={isConfigured()}
      suggestions={suggestions}
      initial={history.map((turn) => ({
        role: turn.role,
        content: turn.content,
        refs: turn.refs,
        evidence: turn.evidence,
      }))}
    />
  );
}
