import Link from "next/link";
import { redirect } from "next/navigation";
import { homePath } from "@/lib/permissions";
import { createTranslator, type MessageKey } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { canRead } from "@/lib/crm-access";
import { seesEverything } from "@/lib/oversight";
import { isAssociationRole } from "@/lib/types";
import {
  associationName,
  associations,
  canManageAssociations,
} from "@/lib/associations";
import { ASSOCIATION_STATUSES, KONTURS } from "@/lib/crm-stages";
import { Badge, Button, EmptyState, FIELD, PageHeader } from "@/components/ui";
import { ASSOCIATION_TONE } from "../companies/tone";
import { ImportPanel } from "./import-panel";

export const dynamic = "force-dynamic";

type Filters = { kontur?: string; status?: string; q?: string };

/**
 * The associations the Assembly is built on (TZ 6.1). The staff see all of
 * them, filtered by contour and standing; an association's own people land
 * on their card, since the list would hold one entry. The chairman's side
 * loads the reference list here as a CSV.
 */
export default async function AssociationsPage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const user = await requireUser();
  if (!canRead(user) && !isAssociationRole(user.role)) redirect(homePath(user.role));
  const locale = await currentLocale(user);
  const t = createTranslator(locale);
  const filters = await searchParams;
  const query = filters.q?.trim() ?? "";
  const rows = await associations(user, { kontur: filters.kontur, status: filters.status, query });

  if (isAssociationRole(user.role) && rows.length === 1 && !query) redirect(`/associations/${rows[0].id}`);

  function href(patch: Partial<Filters>) {
    const next = { kontur: filters.kontur, status: filters.status, q: query || undefined, ...patch };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) if (value) params.set(key, value);
    const search = params.toString();
    return search ? `/associations?${search}` : "/associations";
  }

  const chip = (active: boolean) =>
    `rounded-xl px-3 py-1.5 text-xs font-semibold transition duration-150 ${
      active ? "bg-navy-900 text-white dark:bg-navy-600" : "panel hover:bg-[var(--surface)]"
    }`;
  const manage = canManageAssociations(user);
  const filtered = Boolean(query || filters.kontur || filters.status);

  return (
    <>
      <PageHeader
        title={t("assoc.title")}
        description={t("assoc.desc")}
        action={
          manage ? (
            <Button href="/associations/new" icon="plus">
              {t("assoc.new")}
            </Button>
          ) : undefined
        }
      />

      <form method="get" action="/associations" className="mb-4 flex flex-wrap items-center gap-2">
        {filters.kontur && <input type="hidden" name="kontur" value={filters.kontur} />}
        {filters.status && <input type="hidden" name="status" value={filters.status} />}
        <label className="min-w-0 flex-1 sm:max-w-sm">
          <span className="sr-only">{t("assoc.find")}</span>
          <input type="search" name="q" defaultValue={query} placeholder={t("assoc.find")} className={FIELD} />
        </label>
        <Button type="submit" variant="secondary" icon="search">
          {t("common.search")}
        </Button>
        {query && (
          <Button href={href({ q: undefined })} variant="ghost">
            {t("common.reset")}
          </Button>
        )}
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href={href({ kontur: undefined })} className={chip(!filters.kontur)}>
          {t("assoc.kontur.all")}
        </Link>
        {KONTURS.map((kontur) => (
          <Link key={kontur} href={href({ kontur })} className={chip(filters.kontur === kontur)}>
            {t(`dept.${kontur}` as MessageKey)}
          </Link>
        ))}
        <span className="hidden w-px self-stretch bg-[var(--line)] sm:block" aria-hidden />
        <Link href={href({ status: undefined })} className={chip(!filters.status)}>
          {t("assoc.status.all")}
        </Link>
        {ASSOCIATION_STATUSES.map((status) => (
          <Link key={status} href={href({ status })} className={chip(filters.status === status)}>
            {t(`assoc.status.${status}` as MessageKey)}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          text={filtered ? t("assoc.noMatch") : t("assoc.empty")}
          hint={filtered ? undefined : t("assoc.emptyHint")}
          icon={filtered ? "search" : "users"}
          action={
            filtered ? (
              <Button href="/associations" size="sm" variant="secondary">
                {t("common.reset")}
              </Button>
            ) : manage ? (
              <Button href="/associations/new" size="sm" icon="plus">
                {t("assoc.new")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <Link key={row.id} href={`/associations/${row.id}`} className="block">
              <article className="panel h-full p-4 transition duration-150 hover:shadow-lift hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold [overflow-wrap:anywhere]">{associationName(row, locale)}</p>
                    <p className="muted mt-0.5 truncate text-xs">
                      {[row.sector, row.region, row.kontur].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <Badge className={ASSOCIATION_TONE[row.status] ?? ASSOCIATION_TONE.FAOL}>
                    {t(`assoc.status.${row.status}` as MessageKey)}
                  </Badge>
                </div>

                <dl className="mt-3 space-y-1 text-xs">
                  {row.responsible_name && (
                    <div className="flex gap-2">
                      <dt className="muted w-28 shrink-0">{t("assoc.field.responsible")}</dt>
                      <dd className="min-w-0 truncate">{row.responsible_name}</dd>
                    </div>
                  )}
                  {row.head_name && (
                    <div className="flex gap-2">
                      <dt className="muted w-28 shrink-0">{t("assoc.field.head")}</dt>
                      <dd className="min-w-0 truncate">{row.head_name}</dd>
                    </div>
                  )}
                </dl>

                <dl className="mt-4 flex items-baseline gap-3 border-t pt-3 sm:gap-5">
                  <div>
                    <dd className="text-lg font-bold leading-none tabular-nums">{row.projects}</dd>
                    <dt className="muted mt-1 text-[11px]">{t("assoc.tab.projects")}</dt>
                  </div>
                  <div>
                    <dd className="text-lg font-bold leading-none tabular-nums">{row.companies}</dd>
                    <dt className="muted mt-1 text-[11px]">{t("assoc.tab.companies")}</dt>
                  </div>
                  <div>
                    <dd className="text-lg font-bold leading-none tabular-nums">{row.meetings}</dd>
                    <dt className="muted mt-1 text-[11px]">{t("assoc.tab.meetings")}</dt>
                  </div>
                  <div className="ml-auto text-right">
                    <dd
                      className={`text-lg font-bold leading-none tabular-nums ${
                        row.tasks_open > 0 ? "text-amber-700 dark:text-amber-300" : ""
                      }`}
                    >
                      {row.tasks_open}
                    </dd>
                    <dt className="muted mt-1 text-[11px]">{t("assoc.openTasks")}</dt>
                  </div>
                </dl>
              </article>
            </Link>
          ))}
        </div>
      )}

      {seesEverything(user) && (
        <div className="mt-8">
          <ImportPanel />
        </div>
      )}
    </>
  );
}
