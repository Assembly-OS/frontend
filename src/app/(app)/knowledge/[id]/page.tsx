import { notFound } from "next/navigation";
import { createTranslator, type MessageKey } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import {
  canManageKnowledge,
  documentById,
  documentText,
  isAvailable,
} from "@/lib/knowledge";
import { formatBytes, formatDateTime } from "@/lib/format";
import { id as parseId } from "@/lib/validate";
import { Button, EmptyState, PageHeader, Panel } from "@/components/ui";
import { Icon } from "@/components/icons";
import { approxPages, grouped } from "../library";
import { AutoRefresh, StatusBadge } from "../status";
import { DocumentActions } from "./document-actions";

export const dynamic = "force-dynamic";

/** Parts shown at first, and added by each "show more". */
const PARTS_STEP = 20;
const PARTS_MAX = 400;

/**
 * One document, and exactly what the assistant can read of it.
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
  const document = documentId ? await documentById(documentId) : undefined;
  if (!document) notFound();

  const requested = Number((await searchParams).parts);
  const shown = Number.isInteger(requested)
    ? Math.min(PARTS_MAX, Math.max(PARTS_STEP, requested))
    : PARTS_STEP;

  const [text, locale] = await Promise.all([
    isAvailable(document.status)
      ? documentText(document.id, {
          maxChars: Number.POSITIVE_INFINITY,
          maxParts: shown,
        })
      : Promise.resolve(null),
    currentLocale(user),
  ]);
  const t = createTranslator(locale);

  const reading = document.status === "READING";
  const note =
    (document.status === "FAILED" || document.status === "PARTIAL") &&
    document.reason
      ? t(`knowledge.reason.${document.reason}` as MessageKey)
      : null;

  return (
    <>
      <AutoRefresh active={reading} />

      <div className="mb-4">
        <Button variant="ghost" size="sm" href="/knowledge">
          {t("knowledge.back")}
        </Button>
      </div>

      <PageHeader
        title={document.title}
        description={`${document.file_name} · ${formatBytes(document.file_size)}`}
        action={
          <DocumentActions
            id={document.id}
            status={document.status}
            canManage={canManageKnowledge(user)}
          />
        }
      />

      <Panel className="mb-6">
        <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0">
            <dt className="muted text-xs">{t("knowledge.meta.status")}</dt>
            <dd className="mt-1.5">
              <StatusBadge status={document.status} />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="muted text-xs">{t("knowledge.meta.added")}</dt>
            <dd className="mt-1 truncate text-sm font-medium">
              {document.uploader_name}
            </dd>
            <dd className="muted text-[11px] tabular-nums">
              {formatDateTime(document.updated_at)}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="muted text-xs">{t("knowledge.meta.volume")}</dt>
            <dd className="mt-1 text-sm font-medium tabular-nums">
              {isAvailable(document.status)
                ? `≈ ${grouped(approxPages(document.text_chars))} ${t("knowledge.pagesShort")}`
                : "—"}
            </dd>
            {isAvailable(document.status) && (
              // A labelled count rather than "N parts": Russian and Uzbek
              // decline the noun by number, and "1 частей" reads as a bug.
              <dd className="muted text-[11px] tabular-nums">
                {t("knowledge.parts")}: {grouped(document.part_count)}
              </dd>
            )}
          </div>
          <div className="min-w-0">
            <dt className="muted text-xs">{t("knowledge.meta.read")}</dt>
            <dd className="mt-1 text-sm font-medium tabular-nums">
              {formatDateTime(document.read_at)}
            </dd>
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

      <Panel title={t("knowledge.seen.title")}>
        {text && text.parts.length > 0 ? (
          <>
            <p className="muted border-b px-5 py-3 text-xs">
              {t(
                document.status === "PARTIAL"
                  ? "knowledge.seen.PARTIAL"
                  : "knowledge.seen.READY",
              )}
            </p>
            <ol className="divide-y">
              {text.parts.map((part) => (
                <li
                  key={part.position}
                  id={`part-${part.position}`}
                  className="px-5 py-4"
                >
                  <p className="muted mb-1.5 text-[11px] tabular-nums">
                    {t("knowledge.part")} {part.position} / {document.part_count}
                  </p>
                  <p className="max-w-3xl whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {part.body}
                  </p>
                </li>
              ))}
            </ol>
            {text.nextPart !== null && (
              <div className="border-t p-4">
                <Button
                  variant="secondary"
                  block
                  href={`/knowledge/${document.id}?parts=${shown + PARTS_STEP}#part-${text.nextPart}`}
                >
                  {t("tasks.showMore")} · {document.part_count - text.parts.length}
                </Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            bare
            icon={reading ? "clock" : "alert"}
            text={t(reading ? "knowledge.seen.READING" : "knowledge.seen.FAILED")}
          />
        )}
      </Panel>
    </>
  );
}
