import { currentLocale, requireUser } from "@/lib/session";
import { isConfigured } from "@/lib/agents/claude";
import { transcriptionAvailable } from "@/lib/agents/transcribe";
import { readsAudit } from "@/lib/permissions";
import { projectOptions } from "@/lib/project-visibility";
import { embeddingConfigured } from "@/lib/knowledge/embeddings";
import { queueStats } from "@/lib/knowledge/jobs";
import { canAddToLibrary, listDocuments } from "@/lib/knowledge/library";
import { listSources, memoryStats } from "@/lib/knowledge/sources";
import { createTranslator } from "@/lib/i18n";
import { KnowledgeClient } from "./knowledge-client";

// Statuses change as records are read in the background.
export const dynamic = "force-dynamic";

/**
 * The memory: what the AI chat answers from. Open to everyone signed in —
 * anyone can ask the assistant a question, so anyone can see what it
 * answers from, each within what they may read.
 */
export default async function KnowledgePage() {
  const user = await requireUser();
  const [documents, sources, stats, queue, projects, locale] = await Promise.all([
    listDocuments(user),
    listSources(user, { limit: 30 }),
    memoryStats(),
    queueStats(),
    canAddToLibrary(user) ? projectOptions(user) : Promise.resolve([]),
    currentLocale(user),
  ]);
  const t = createTranslator(locale);

  // What the memory cannot do on this server, said once, to the people who
  // can act on it: the key and the providers are the administrators'.
  const notes: string[] = [];
  if (!isConfigured()) notes.push(t("knowledge.noKey"));
  if (readsAudit(user.role)) {
    if (!embeddingConfigured()) notes.push(t("knowledge.noEmbeddings"));
    if (!transcriptionAvailable()) notes.push(t("knowledge.noStt"));
  }

  return (
    <KnowledgeClient
      canAdd={canAddToLibrary(user)}
      notes={notes}
      projects={projects}
      stats={{
        ready: stats.ready,
        waiting: stats.pending + queue.queued,
        failed: stats.failed,
        lastIndexedAt: stats.last_indexed_at,
      }}
      documents={documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        file_name: doc.file_name,
        file_size: doc.file_size,
        format: doc.format,
        visibility: doc.visibility,
        status: doc.status,
        text_chars: doc.text_chars,
        uploader_name: doc.uploader_name,
        updated_at: doc.updated_at,
      }))}
      initialSources={sources.rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        title: row.title,
        status: row.status,
        reason: row.reason,
        occurred_at: row.occurred_at,
        author_name: row.author_name,
        project_code: row.project_code,
        href: row.href,
      }))}
      initialMore={sources.more}
    />
  );
}
