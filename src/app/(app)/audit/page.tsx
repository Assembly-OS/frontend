import { redirect } from "next/navigation";
import { createTranslator, type MessageKey } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { homePath, readsAudit } from "@/lib/permissions";
import { auditCount, auditEntities, auditPage, type AuditAction, type AuditRow } from "@/lib/audit";
import { formatDateTime, formatNumber } from "@/lib/format";
import { id as parseId } from "@/lib/validate";
import { NEUTRAL_TONE } from "@/lib/types";
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  Panel,
  Select,
  TableWrap,
  Td,
  Th,
} from "@/components/ui";

export const dynamic = "force-dynamic";

const ACTIONS: AuditAction[] = ["INSERT", "UPDATE", "DELETE", "AI_GLOBAL"];

/** Tables the journal names in words; anything else shows its table name. */
const NAMED = new Set([
  "users", "uyushmalar", "klasterlar", "loyihalar", "project_members",
  "project_threads", "thread_entries", "thread_members", "project_stages",
  "project_documents", "meetings", "meeting_projects", "meeting_staff",
  "kelishuvlar", "kelishuv_parties", "agreements", "partners", "contacts",
  "partner_notes", "tasks", "task_stages", "task_progress", "assistant",
]);

const clip = (value: unknown, n = 120) => {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text && text.length > n ? `${text.slice(0, n)}…` : (text ?? "—");
};

/** One line saying what the entry is about, in the record's own words. */
function summary(row: AuditRow): string {
  const detail = row.detail ?? {};
  if (row.action === "AI_GLOBAL") return clip(detail.question, 160);
  if (row.action === "UPDATE") return Object.keys(detail).join(", ");
  const name = detail.title ?? detail.name ?? detail.full_name ?? detail.code ?? detail.description;
  return name ? clip(name) : "";
}

/**
 * The audit journal, TZ 4.4: every create, change and delete, and every
 * question put to the global AI view — who, when, what.
 *
 * Open to the chairman and the head of AI Lab, the two the TZ names. Nothing
 * here can change the journal; the database refuses it anyway. Newest first,
 * fifty at a time, narrowed by record type and kind of action; a change
 * opens to what it changed, field by field.
 */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; action?: string; before?: string }>;
}) {
  const user = await requireUser();
  if (!readsAudit(user.role)) redirect(homePath(user.role));

  const locale = await currentLocale(user);
  const t = createTranslator(locale);
  const params = await searchParams;
  const entity = params.entity?.slice(0, 40) || null;
  const action = ACTIONS.includes(params.action as AuditAction)
    ? (params.action as AuditAction)
    : null;
  const before = parseId(params.before);

  const [{ rows, more }, entities, total] = await Promise.all([
    auditPage({ entity, action, before }),
    auditEntities(),
    auditCount(),
  ]);

  const entityLabel = (name: string) =>
    NAMED.has(name) ? t(`audit.entity.${name}` as MessageKey) : name;
  const actionLabel = (name: AuditAction) => t(`audit.action.${name}` as MessageKey);
  const who = (row: AuditRow) => row.actor_name ?? t("audit.nobody");

  const olderHref = () => {
    const search = new URLSearchParams();
    if (entity) search.set("entity", entity);
    if (action) search.set("action", action);
    search.set("before", String(rows[rows.length - 1]?.id ?? 0));
    return `/audit?${search.toString()}`;
  };

  // A change opens to what it changed; a created or deleted row, to itself.
  const details = (row: AuditRow) => {
    const detail = row.detail ?? {};
    const lines =
      row.action === "UPDATE"
        ? Object.entries(detail).map(([key, value]) => {
            const change = value as { from?: unknown; to?: unknown };
            return `${key}: ${clip(change.from)} → ${clip(change.to)}`;
          })
        : row.action === "AI_GLOBAL"
          ? []
          : Object.entries(detail)
              .filter(([, value]) => value !== null && value !== "")
              .map(([key, value]) => `${key}: ${clip(value)}`);
    if (lines.length === 0) return null;
    return (
      <details className="mt-1">
        <summary className="muted cursor-pointer text-[11px] hover:underline">
          {t("audit.details")}
        </summary>
        <ul className="muted mt-1 space-y-0.5 break-words font-mono text-[11px]">
          {lines.slice(0, 24).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </details>
    );
  };

  return (
    <>
      <PageHeader
        title={t("audit.title")}
        description={t("audit.subtitle").replace("{n}", formatNumber(total))}
      />

      <form method="get" action="/audit" className="mb-4 flex flex-wrap gap-2">
        <Select name="entity" defaultValue={entity ?? ""} aria-label={t("audit.filterEntity")} className="w-auto min-w-0 flex-1 sm:flex-none">
          <option value="">{t("audit.allEntities")}</option>
          {entities.map((name) => (
            <option key={name} value={name}>
              {entityLabel(name)}
            </option>
          ))}
        </Select>
        <Select name="action" defaultValue={action ?? ""} aria-label={t("audit.filterAction")} className="w-auto min-w-0 flex-1 sm:flex-none">
          <option value="">{t("audit.allActions")}</option>
          {ACTIONS.map((name) => (
            <option key={name} value={name}>
              {actionLabel(name)}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary">
          {t("audit.show")}
        </Button>
      </form>

      <Panel>
        {rows.length === 0 ? (
          <EmptyState
            bare
            icon="shield"
            text={t("audit.empty")}
            hint={entity || action ? t("audit.emptyFiltered") : t("audit.emptyHint")}
          />
        ) : (
          <>
            {/* A table from `sm` up, a list of cards below it. */}
            <div className="hidden sm:block">
              <TableWrap>
                <thead>
                  <tr>
                    <Th>{t("audit.when")}</Th>
                    <Th>{t("audit.who")}</Th>
                    <Th>{t("audit.what")}</Th>
                    <Th>{t("audit.record")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="align-top">
                      <Td className="whitespace-nowrap text-xs tabular-nums">{formatDateTime(row.at)}</Td>
                      <Td className="text-sm">{who(row)}</Td>
                      <Td>
                        <Badge className={NEUTRAL_TONE}>{actionLabel(row.action)}</Badge>
                      </Td>
                      <Td className="min-w-0 text-sm">
                        <span className="font-medium">{entityLabel(row.entity)}</span>
                        {row.entity_id && <span className="muted tabular-nums"> #{row.entity_id}</span>}
                        {summary(row) && <p className="muted mt-0.5 text-xs">{summary(row)}</p>}
                        {details(row)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </div>
            <ul className="divide-y sm:hidden">
              {rows.map((row) => (
                <li key={row.id} className="px-4 py-3">
                  <p className="flex flex-wrap items-center gap-2">
                    <Badge className={NEUTRAL_TONE}>{actionLabel(row.action)}</Badge>
                    <span className="text-sm font-medium">{entityLabel(row.entity)}</span>
                    {row.entity_id && <span className="muted text-xs tabular-nums">#{row.entity_id}</span>}
                  </p>
                  {summary(row) && <p className="mt-1 break-words text-sm">{summary(row)}</p>}
                  <p className="muted mt-1 text-[11px] tabular-nums">
                    {who(row)} · {formatDateTime(row.at)}
                  </p>
                  {details(row)}
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      {more && (
        <div className="mt-4 flex justify-center">
          <Button href={olderHref()} variant="secondary" size="sm">
            {t("audit.older")}
          </Button>
        </div>
      )}
    </>
  );
}
