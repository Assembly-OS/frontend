import { notFound } from "next/navigation";
import { createTranslator, type MessageKey } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { findFacts, readSource } from "@/lib/knowledge/retrieve";
import { viewSource } from "@/lib/knowledge/sources";
import { formatDate, formatDateTime } from "@/lib/format";
import { id as parseId } from "@/lib/validate";
import { Badge, Button, EmptyState, PageHeader, Panel } from "@/components/ui";
import { Icon } from "@/components/icons";
import { isBusy } from "../../library";
import { AutoRefresh, KindBadge, StatusBadge } from "../../status";
import { SourceActions } from "./source-actions";

export const dynamic = "force-dynamic";

const STEP = 20;
const MAX = 400;

/**
 * One record as the memory holds it: what it took from it, and the
 * passages it reads — the evidence behind an answer that cited it.
 * Reachable by whoever may read the record itself; anyone else gets 404.
 */
export default async function SourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ parts?: string }>;
}) {
  const user = await requireUser();
  const sourceId = parseId((await params).id);
  const source = sourceId ? await viewSource(user, sourceId) : undefined;
  if (!source) notFound();

  const requested = Number((await searchParams).parts);
  const shown = Number.isInteger(requested) ? Math.min(MAX, Math.max(STEP, requested)) : STEP;

  const [text, facts, locale] = await Promise.all([
    readSource(user, source.id, { maxChars: Number.POSITIVE_INFINITY, maxChunks: shown }),
    findFacts(user, { limit: 50 }).then((rows) => rows.filter((fact) => fact.source_id === source.id)),
    currentLocale(user),
  ]);
  const t = createTranslator(locale);

  const busy = isBusy(source.status);
  const note =
    (source.status === "FAILED" || source.status === "PARTIAL" || source.status === "SKIPPED") && source.reason
      ? t(`knowledge.reason.${source.reason}` as MessageKey)
      : null;

  return (
    <>
      <AutoRefresh active={busy} />

      <div className="mb-4">
        <Button variant="ghost" size="sm" href="/knowledge">
          {t("knowledge.source.back")}
        </Button>
      </div>

      <PageHeader
        title={source.title}
        description={[
          t(`knowledge.kind.${source.kind}` as MessageKey),
          source.occurred_at ? formatDate(source.occurred_at) : null,
          source.author_name,
          source.project_code ? `${source.project_code} ${source.project_name ?? ""}`.trim() : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        action={
          <SourceActions
            id={source.id}
            href={source.href}
            retryable={source.status === "FAILED" || source.status === "PARTIAL"}
          />
        }
      />

      <Panel className="mb-6">
        <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0">
            <dt className="muted text-xs">{t("knowledge.doc.meta.status")}</dt>
            <dd className="mt-1.5 flex flex-wrap gap-1.5">
              <StatusBadge status={source.status} />
              <KindBadge kind={source.kind} />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="muted text-xs">{t("knowledge.source.happened")}</dt>
            <dd className="mt-1 text-sm font-medium tabular-nums">
              {source.occurred_at ? formatDate(source.occurred_at) : "—"}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="muted text-xs">{t("knowledge.source.recorded")}</dt>
            <dd className="mt-1 text-sm font-medium tabular-nums">
              {source.indexed_at ? formatDateTime(source.indexed_at) : "—"}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="muted text-xs">{t("knowledge.source.reliability")}</dt>
            <dd className="mt-1 text-sm font-medium tabular-nums">
              {Math.round(source.reliability * 100)}%
            </dd>
            <dd className="muted text-[11px] tabular-nums">
              {t("knowledge.parts")}: {source.chunk_count}
            </dd>
          </div>
        </dl>
        {(note || source.last_error) && (
          <p className="flex items-start gap-2 border-t px-5 py-3 text-sm">
            <Icon
              name="alert"
              className={`mt-0.5 size-4 shrink-0 ${
                source.status === "FAILED"
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            />
            <span>
              {note}
              {source.status === "FAILED" && source.last_error ? (
                <span className="muted block text-xs">{source.last_error}</span>
              ) : null}
            </span>
          </p>
        )}
      </Panel>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Panel title={t("knowledge.source.facts")}>
          {facts.length === 0 ? (
            <EmptyState bare icon="check" text={t("knowledge.source.noFacts")} />
          ) : (
            <ul className="divide-y">
              {facts.map((fact) => (
                <li key={fact.id} className="px-5 py-3.5">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Badge className="muted bg-[var(--surface)] ring-[var(--line)]">
                      {t(`knowledge.fact.${fact.kind}` as MessageKey)}
                    </Badge>
                    <span className="muted text-[11px]">
                      {t(`knowledge.fact.${fact.stated}` as MessageKey)}
                      {fact.stated === "inferred" ? ` · ${Math.round(fact.confidence * 100)}%` : ""}
                    </span>
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed [overflow-wrap:anywhere]">
                    {fact.statement}
                  </p>
                  <p className="muted mt-1 text-[11px]">
                    {fact.who_name ?? fact.who
                      ? `${t("knowledge.fact.who")}: ${fact.who_name ?? fact.who}`
                      : ""}
                    {fact.due_on ? ` · ${t("knowledge.fact.due")}: ${formatDate(fact.due_on)}` : ""}
                    {fact.task_code
                      ? ` · ${t("knowledge.fact.task")}: ${fact.task_code} (${fact.task_status})`
                      : ""}
                  </p>
                  {fact.quote && (
                    <p className="muted mt-1.5 border-l-2 pl-2.5 text-xs leading-relaxed [overflow-wrap:anywhere]">
                      {fact.quote}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={t("knowledge.source.passages")}>
          {text && text.chunks.length > 0 ? (
            <>
              <ol className="divide-y">
                {text.chunks.map((chunk) => (
                  <li key={chunk.position} id={`part-${chunk.position}`} className="px-5 py-4">
                    <p className="muted mb-1.5 text-[11px] tabular-nums">
                      {t("knowledge.part")} {chunk.position} / {source.chunk_count}
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
                    href={`/knowledge/sources/${source.id}?parts=${shown + STEP}#part-${text.nextPosition}`}
                  >
                    {t("knowledge.source.showMore")} · {source.chunk_count - text.chunks.length}
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
      </div>
    </>
  );
}
