import { notFound } from "next/navigation";
import { createTranslator, type MessageKey } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { canManageDocument, documentById, isAvailable } from "@/lib/knowledge/library";
import { readSource } from "@/lib/knowledge/retrieve";
import { formatBytes, formatDateTime } from "@/lib/format";
import { id as parseId } from "@/lib/validate";
import { Button, EmptyState, PageHeader, Panel } from "@/components/ui";
import { Icon } from "@/components/icons";
import { approxPages, grouped, isBusy } from "../library";
import { AutoRefresh, StatusBadge } from "../status";
import { DocumentActions } from "./document-actions";

export const dynamic = "force-dynamic";

/** Passages shown at first, and added by each "show more". */
const STEP = 20;
const MAX = 400;

/**
 * One library document, and exactly what the assistant can read of it.
 *
 * The text shown is the stored passages themselves, not the original file
 * rendered again: if the reading missed a table or garbled a scan, this is
 * where somebody sees it, because this is what the answers are built from.
 */
export default async function KnowledgeDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ parts?: string }>;
}) {
  const user = await requireUser();
  const documentId = parseId((await params).id);
  const document = documentId ? await documentById(user, documentId) : undefined;
  if (!document) notFound();

  const requested = Number((await searchParams).parts);
  const shown = Number.isInteger(requested) ? Math.min(MAX, Math.max(STEP, requested)) : STEP;

  const [text, locale] = await Promise.all([
    document.source_id && isAvailable(document.status)
      ? readSource(user, document.source_id, { maxChars: Number.POSITIVE_INFINITY, maxChunks: shown })
      : Promise.resolve(null),
    currentLocale(user),
  ]);
  const t = createTranslator(locale);

  const busy = isBusy(document.status);
  const note =
    (document.status === "FAILED" || document.status === "PARTIAL") && document.reason
      ? t(`knowledge.reason.${document.reason}` as MessageKey)
      : null;

  return (
    <>
      <AutoRefresh active={busy} />

      <div className="mb-4">
        <Button variant="ghost" size="sm" href="/knowledge">
          {t("knowledge.doc.back")}
        </Button>
      </div>

      <PageHeader
        title={document.title}
        description={`${document.file_name} · ${formatBytes(document.file_size)}`}
        action={
          <DocumentActions
            id={document.id}
            status={document.status}
            canManage={canManageDocument(user, document)}
          />
        }
      />

      <Panel className="mb-6">
        <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0">
            <dt className="muted text-xs">{t("knowledge.doc.meta.status")}</dt>
            <dd className="mt-1.5">
              <StatusBadge status={document.status} />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="muted text-xs">{t("knowledge.doc.meta.added")}</dt>
            <dd className="mt-1 truncate text-sm font-medium">{document.uploader_name}</dd>
            <dd className="muted text-[11px] tabular-nums">{formatDateTime(document.updated_at)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="muted text-xs">{t("knowledge.doc.meta.visibility")}</dt>
            <dd className="mt-1 text-sm font-medium">
              {t(`knowledge.vis.${document.visibility}` as MessageKey)}
              {document.project_code ? ` · ${document.project_code}` : ""}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="muted text-xs">{t("knowledge.doc.meta.volume")}</dt>
            <dd className="mt-1 text-sm font-medium tabular-nums">
              {isAvailable(document.status)
                ? `≈ ${grouped(approxPages(document.text_chars))} ${t("knowledge.pagesShort")}`
                : "—"}
            </dd>
            {isAvailable(document.status) && (
              // A labelled count rather than "N parts": Russian and Uzbek
              // decline the noun by number, and "1 частей" reads as a bug.
              <dd className="muted text-[11px] tabular-nums">
                {t("knowledge.parts")}: {grouped(document.chunk_count)}
                {document.indexed_at ? ` · ${formatDateTime(document.indexed_at)}` : ""}
              </dd>
            )}
          </div>
        </dl>

        {note && (
          <p className="flex items-start gap-2 border-t px-5 py-3 text-sm">
            <Icon
              name="alert"
              className={`mt-0.5 size-4 shrink-0 ${
                document.status === "FAILED"
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            />
            <span>{note}</span>
          </p>
        )}
      </Panel>

      <Panel
        title={t("knowledge.seen.title")}
        action={
          document.source_id ? (
            <Button variant="ghost" size="sm" href={`/knowledge/sources/${document.source_id}`}>
              {t("knowledge.passages")}
            </Button>
          ) : undefined
        }
      >
        {text && text.chunks.length > 0 ? (
          <>
            <p className="muted border-b px-5 py-3 text-xs">
              {t(document.status === "PARTIAL" ? "knowledge.seen.PARTIAL" : "knowledge.seen.READY")}
            </p>
            <ol className="divide-y">
              {text.chunks.map((chunk) => (
                <li key={chunk.position} id={`part-${chunk.position}`} className="px-5 py-4">
                  <p className="muted mb-1.5 text-[11px] tabular-nums">
                    {t("knowledge.part")} {chunk.position} / {document.chunk_count}
                    {chunk.section ? ` · ${chunk.section}` : ""}
                  </p>
                  <p className="max-w-3xl whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {chunk.body}
                  </p>
                </li>
              ))}
            </ol>
            {text.nextPosition !== null && (
              <div className="border-t p-4">
                <Button
                  variant="secondary"
                  block
                  href={`/knowledge/${document.id}?parts=${shown + STEP}#part-${text.nextPosition}`}
                >
                  {t("knowledge.source.showMore")} · {document.chunk_count - text.chunks.length}
                </Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            bare
            icon={busy ? "clock" : "alert"}
            text={t(busy ? "knowledge.seen.PENDING" : "knowledge.seen.FAILED")}
          />
        )}
      </Panel>
    </>
  );
}
