import { requireUser } from "@/lib/session";
import { isConfigured } from "@/lib/agents/claude";
import { canManageKnowledge, listDocuments } from "@/lib/knowledge";
import { KnowledgeClient } from "./knowledge-client";

// Statuses change as documents are read in the background.
export const dynamic = "force-dynamic";

/**
 * The document library. Open to all staff: anyone can ask the assistant a
 * question, so anyone can see what it answers from.
 */
export default async function KnowledgePage() {
  const user = await requireUser();
  const documents = await listDocuments();

  return (
    <KnowledgeClient
      canManage={canManageKnowledge(user)}
      llmConfigured={isConfigured()}
      documents={documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        file_name: doc.file_name,
        file_size: doc.file_size,
        format: doc.format,
        status: doc.status,
        reason: doc.reason,
        text_chars: doc.text_chars,
        part_count: doc.part_count,
        uploader_name: doc.uploader_name,
        updated_at: doc.updated_at,
      }))}
    />
  );
}
