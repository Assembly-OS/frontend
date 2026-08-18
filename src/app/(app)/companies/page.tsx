import Link from "next/link";
import { createTranslator, type MessageKey } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { canWrite } from "@/lib/crm-access";
import { companies } from "@/lib/crm";
import {
  Badge,
  Button,
  EmptyState,
  FIELD,
  PageHeader,
} from "@/components/ui";
import { formatDate } from "@/lib/format";
import { COMPANY_TONE } from "./tone";

export const dynamic = "force-dynamic";

/** The directory. One row per company, with the numbers that decide who to open. */
export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const user = await requireUser();
  const locale = await currentLocale(user);
  const t = createTranslator(locale);
  const filters = await searchParams;
  const rows = companies({ status: filters.status, query: filters.q });

  const tabs = ["ALL", "ACTIVE", "POTENTIAL", "PAUSED", "ARCHIVED"] as const;
  const current = filters.status ?? "ALL";
  const query = filters.q?.trim() ?? "";

  /** Keeps whichever filter is not being changed, so the two compose. */
  function href(status: string, q: string) {
    const params = new URLSearchParams();
    if (status !== "ALL") params.set("status", status);
    if (q) params.set("q", q);
    const search = params.toString();
    return search ? `/companies?${search}` : "/companies";
  }

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

      <form
        method="get"
        action="/companies"
        className="mb-4 flex flex-wrap items-center gap-2"
      >
        {/* Searching must not silently drop the status the user is looking at. */}
        {current !== "ALL" && (
          <input type="hidden" name="status" value={current} />
        )}
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
          <Button href={href(current, "")} variant="ghost">
            {t("common.reset")}
          </Button>
        )}
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab}
            href={href(tab, query)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition duration-150 ${
              current === tab
                ? "bg-navy-900 text-white dark:bg-navy-600"
                : "panel hover:bg-[var(--surface)]"
            }`}
          >
            {tab === "ALL"
              ? t("common.all")
              : t(`crm.status.${tab}` as MessageKey)}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          text={query ? t("crm.nothingFound") : t("crm.noCompanies")}
          hint={query ? t("crm.searchFields") : t("crm.companiesDesc")}
          icon={query ? "search" : "users"}
          action={
            query ? (
              <Button href={href(current, "")} size="sm" variant="secondary">
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
          {rows.map((company) => (
            <Link key={company.id} href={`/companies/${company.id}`} className="block">
              <article className="panel h-full p-4 transition duration-150 hover:shadow-lift hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{company.name}</p>
                    <p className="muted truncate text-xs">
                      {[company.industry, company.city].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <Badge className={COMPANY_TONE[company.status] ?? COMPANY_TONE.POTENTIAL}>
                    {t(`crm.status.${company.status}` as MessageKey)}
                  </Badge>
                </div>

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
          ))}
        </div>
      )}
    </>
  );
}
