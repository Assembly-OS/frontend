import Link from "next/link";
import { redirect } from "next/navigation";
import { homePath } from "@/lib/permissions";
import { createTranslator, type MessageKey } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { canWrite, canRead } from "@/lib/crm-access";
import { COMPANY_PAGE, companies, companyCount, funnel } from "@/lib/crm";
import { daysIn, isStage, isStuck, STAGES } from "@/lib/crm-stages";
import { stageLimits } from "@/lib/settings";
import { seesEverything } from "@/lib/oversight";
import { associationById } from "@/lib/associations";
import {
  Badge,
  Button,
  EmptyState,
  FIELD,
  PageHeader,
} from "@/components/ui";
import { formatDate } from "@/lib/format";
import { id as parseId } from "@/lib/validate";
import { COMPANY_TONE, PATH_TONE, STUCK_TONE } from "./tone";
import { CrmSettingsPanel } from "./crm-settings";

export const dynamic = "force-dynamic";

type Filters = {
  status?: string;
  stage?: string;
  stuck?: string;
  uyushma?: string;
  q?: string;
  page?: string;
};

/**
 * The directory. One row per company, with the numbers that decide who to
 * open — and, since block 6, where each stands on the partnership path: the
 * funnel on top counts them stage by stage, a stuck company says so on its
 * card, and the chairman's side sets how long a stay is too long.
 */
export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const user = await requireUser();
  // The companies and agreements base is the staff's (TZ 4.3).
  if (!canRead(user)) redirect(homePath(user.role));
  const locale = await currentLocale(user);
  const t = createTranslator(locale);
  const filters = await searchParams;
  const stage = isStage(filters.stage) ? filters.stage : undefined;
  const uyushmaId = parseId(filters.uyushma);
  const onlyStuck = filters.stuck === "1";

  const limits = await stageLimits();
  const pageNo = Math.max(1, Number(filters.page) || 1);
  const base = { status: filters.status, stage, uyushmaId, query: filters.q };
  // TZ 8.5: the list is filtered and paged on the server; "stuck" is a
  // SQL predicate over the stage limits, not a pass over every row.
  const [rows, total, stuckTotal, counts, association] = await Promise.all([
    companies({ ...base, stuckLimits: onlyStuck ? limits : null, page: pageNo, pageSize: COMPANY_PAGE }),
    companyCount({ ...base, stuckLimits: onlyStuck ? limits : null }),
    companyCount({ ...base, stuckLimits: limits }),
    funnel(),
    uyushmaId ? associationById(user, uyushmaId) : undefined,
  ]);
  const pages = Math.max(1, Math.ceil(total / COMPANY_PAGE));
  const today = new Date();
  const stuckOf = (row: (typeof rows)[number]) => isStuck(row.stage, row.stage_since, limits, today);

  const tabs = ["ALL", "ACTIVE", "POTENTIAL", "PAUSED", "ARCHIVED"] as const;
  const current = filters.status ?? "ALL";
  const query = filters.q?.trim() ?? "";

  /** Keeps whichever filter is not being changed, so they all compose. */
  function href(patch: Partial<Filters>) {
    // A changed filter starts from the first page; only `page` keeps it.
    const next: Filters = {
      status: current === "ALL" ? undefined : current,
      stage,
      stuck: onlyStuck ? "1" : undefined,
      uyushma: uyushmaId ? String(uyushmaId) : undefined,
      q: query || undefined,
      ...patch,
    };
    if (next.page === "1") delete next.page;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) if (value) params.set(key, value);
    const search = params.toString();
    return search ? `/companies?${search}` : "/companies";
  }

  const chip = (active: boolean) =>
    `rounded-xl px-3 py-1.5 text-xs font-semibold transition duration-150 ${
      active ? "bg-navy-900 text-white dark:bg-navy-600" : "panel hover:bg-[var(--surface)]"
    }`;

  return (
    <>
      <PageHeader
        title={t("crm.companies")}
        description={t("crm.companiesDesc")}
        action={
          canWrite(user) ? (
            <Button href="/companies/new" icon="plus">
              {t("crm.newCompany")}
            </Button>
          ) : undefined
        }
      />

      {/* The funnel (TZ 6.2): how many companies stand at each stage. Each
          cell filters the list; the strip scrolls inside itself on a phone. */}
      <section className="panel mb-4" aria-label={t("crm.funnel")}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b px-5 py-3">
          <h2 className="text-sm font-semibold tracking-tight">{t("crm.funnel")}</h2>
          <p className="muted text-[11px]">{t("crm.funnel.hint")}</p>
        </div>
        <div className="scroll-thin overflow-x-auto">
          <ol className="grid min-w-[720px] grid-cols-9 divide-x">
            {STAGES.map((item, index) => {
              const active = stage === item;
              return (
                <li key={item}>
                  <Link
                    href={href({ stage: active ? undefined : item })}
                    aria-current={active ? "true" : undefined}
                    className={`block px-3 py-3 transition duration-150 hover:bg-[var(--surface)] ${
                      active ? "bg-[var(--surface)]" : ""
                    }`}
                  >
                    <p className="text-lg font-bold leading-none tabular-nums">{counts[item] ?? 0}</p>
                    <p className="muted mt-1.5 text-[11px] font-medium leading-tight">
                      <span className="tabular-nums">{index + 1}.</span> {t(`crm.stage.${item}` as MessageKey)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <form
        method="get"
        action="/companies"
        className="mb-4 flex flex-wrap items-center gap-2"
      >
        {/* Searching must not silently drop the filters the user is looking at. */}
        {current !== "ALL" && <input type="hidden" name="status" value={current} />}
        {stage && <input type="hidden" name="stage" value={stage} />}
        {onlyStuck && <input type="hidden" name="stuck" value="1" />}
        {uyushmaId && <input type="hidden" name="uyushma" value={uyushmaId} />}
        <label className="min-w-0 flex-1 sm:max-w-sm">
          <span className="sr-only">{t("crm.search")}</span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={t("crm.searchCompanies")}
            className={FIELD}
          />
        </label>
        <Button type="submit" variant="secondary" icon="search">
          {t("crm.search")}
        </Button>
        {query && (
          <Button href={href({ q: undefined })} variant="ghost">
            {t("common.reset")}
          </Button>
        )}
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link key={tab} href={href({ status: tab === "ALL" ? undefined : tab })} className={chip(current === tab)}>
            {tab === "ALL" ? t("common.all") : t(`crm.status.${tab}` as MessageKey)}
          </Link>
        ))}
        {/* Stuck is a question of its own: "who needs a push" (TZ 6.2). */}
        <Link
          href={href({ stuck: onlyStuck ? undefined : "1" })}
          className={`${chip(onlyStuck)} tabular-nums`}
          title={t("crm.stuckHint")}
        >
          {t("crm.stuckOnly")} · {stuckTotal}
        </Link>
        {stage && (
          <Link href={href({ stage: undefined })} className={chip(true)}>
            {t(`crm.stage.${stage}` as MessageKey)} ×
          </Link>
        )}
        {association && (
          <Link href={href({ uyushma: undefined })} className={chip(true)}>
            {association.short_name || association.name} ×
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          text={query || stage || onlyStuck ? t("crm.nothingFound") : t("crm.noCompanies")}
          hint={query ? t("crm.searchFields") : onlyStuck ? t("crm.stuckHint") : t("crm.companiesDesc")}
          icon={query ? "search" : "users"}
          action={
            query || stage || onlyStuck || uyushmaId ? (
              <Button href="/companies" size="sm" variant="secondary">
                {t("common.reset")}
              </Button>
            ) : canWrite(user) ? (
              <Button href="/companies/new" size="sm" icon="plus">
                {t("crm.newCompany")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((company) => {
            const stuck = stuckOf(company);
            const days = daysIn(company.stage_since, today);
            return (
              <Link key={company.id} href={`/companies/${company.id}`} className="block">
                <article className="panel h-full p-4 transition duration-150 hover:shadow-lift hover:-translate-y-0.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{company.name}</p>
                      <p className="muted truncate text-xs">
                        {[company.industry, company.city, company.uyushma_name].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    <Badge className={COMPANY_TONE[company.status] ?? COMPANY_TONE.POTENTIAL}>
                      {t(`crm.status.${company.status}` as MessageKey)}
                    </Badge>
                  </div>

                  {/* The stage, and how long it has been the stage. Red only
                      when the stay is past the limit — the one signal here. */}
                  <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Badge className={stuck ? STUCK_TONE : PATH_TONE[company.stage] ?? PATH_TONE.NEW_CONTACT}>
                      {t(`crm.stage.${company.stage}` as MessageKey)}
                    </Badge>
                    {days !== null && (
                      <span className={`text-[11px] tabular-nums ${stuck ? "font-semibold text-rose-700 dark:text-rose-300" : "muted"}`}>
                        {days} {t("crm.daysInStage")}
                        {stuck ? ` · ${t("crm.stuck")}` : ""}
                      </span>
                    )}
                  </p>

                  {/* Промежуток сжимается на узком экране: три числа и дата в 360px
    с gap-5 не помещаются, и «Последний контакт» вылезал за карточку. */}
                  <dl className="mt-4 flex items-baseline gap-3 border-t pt-3 sm:gap-5">
                    <div>
                      <dd className="text-lg font-bold leading-none tabular-nums">
                        {company.meetings}
                      </dd>
                      <dt className="muted mt-1 text-[11px]">{t("crm.tab.meetings")}</dt>
                    </div>
                    <div>
                      <dd
                        className={`text-lg font-bold leading-none tabular-nums ${
                          company.open_agreements > 0
                            ? "text-amber-700 dark:text-amber-300"
                            : ""
                        }`}
                      >
                        {company.open_agreements}
                      </dd>
                      <dt className="muted mt-1 text-[11px]">{t("crm.tab.agreements")}</dt>
                    </div>
                    <div>
                      <dd className="text-lg font-bold leading-none tabular-nums">
                        {company.contacts}
                      </dd>
                      <dt className="muted mt-1 text-[11px]">{t("crm.tab.contacts")}</dt>
                    </div>
                    <div className="ml-auto min-w-0 text-right">
                      <dd className="text-xs font-medium tabular-nums">
                        {formatDate(company.last_contact_at ?? company.last_seen)}
                      </dd>
                      <dt className="muted mt-1 text-[11px]">{t("crm.field.lastContact")}</dt>
                    </div>
                  </dl>
                </article>
              </Link>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between gap-3 text-xs" aria-label={t("common.pageOf")}>
          <Button href={href({ page: String(Math.max(1, pageNo - 1)) })} size="sm" variant="ghost" disabled={pageNo <= 1}>
            ← {t("common.prev")}
          </Button>
          <span className="muted tabular-nums">
            {t("common.pageOf").replace("{page}", String(pageNo)).replace("{pages}", String(pages))} · {total}
          </span>
          <Button href={href({ page: String(Math.min(pages, pageNo + 1)) })} size="sm" variant="ghost" disabled={pageNo >= pages}>
            {t("common.next")} →
          </Button>
        </nav>
      )}

      {seesEverything(user) && (
        <div className="mt-8">
          <CrmSettingsPanel initial={limits} />
        </div>
      )}
    </>
  );
}
