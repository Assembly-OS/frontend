import Link from "next/link";
import { createTranslator, type MessageKey } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { canWrite } from "@/lib/crm-access";
import { agreementBoard, companies, type AgreementRow } from "@/lib/crm";
import {
  KELISHUV_PAGE,
  KELISHUV_STATUSES,
  missingKelishuv,
  searchKelishuvlar,
  type KelishuvFilter,
} from "@/lib/kelishuvlar";
import { assignableUsers } from "@/lib/queries";
import { formatDate, formatNumber } from "@/lib/format";
import { INCOMPLETE_TONE, NEUTRAL_TONE, kelishuvTone } from "@/lib/types";
import {
  Badge,
  Button,
  EmptyState,
  FIELD,
  PageHeader,
  Panel,
} from "@/components/ui";
import { AgreementRowItem } from "./agreement-row";
import { NewAgreement } from "./new-agreement";

export const dynamic = "force-dynamic";

const FILTERS: KelishuvFilter[] = ["ALL", ...KELISHUV_STATUSES];

/**
 * Agreements, and the obligations they bind people to.
 *
 * Two views of one subject. "Agreements" is the register block 1.2 of the TZ
 * asks for: every agreement, closed ones included and shown by default,
 * filterable by status — the old page showed only what was still open, when
 * a fulfilled or cancelled agreement is exactly what gets looked up later.
 * "Obligations" is the deadline board this page always was — today, soon,
 * overdue — unchanged, because it answers a different question and people
 * work from it.
 *
 * Staff who may not write in the CRM see only their own obligations, as
 * before: an employee scrolling past the Assembly's agreements to find the
 * two things they owe would stop opening the page.
 */
export default async function AgreementsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; status?: string; q?: string; page?: string }>;
}) {
  const user = await requireUser();
  const locale = await currentLocale(user);
  const t = createTranslator(locale);
  const writable = canWrite(user);
  const params = await searchParams;
  const view = writable && params.view !== "obligations" ? "register" : "obligations";

  const tabs = writable ? (
    <nav className="mb-5 flex gap-5 border-b text-sm" aria-label={t("kelishuv.title")}>
      {(
        [
          ["register", "kelishuv.title", "/agreements"],
          ["obligations", "crm.agreements", "/agreements?view=obligations"],
        ] as const
      ).map(([key, label, href]) => (
        <Link
          key={key}
          href={href}
          aria-current={view === key ? "page" : undefined}
          className={`-mb-px border-b-2 pb-2.5 transition duration-150 ${
            view === key
              ? "border-[var(--ink)] font-semibold"
              : "muted border-transparent hover:text-[var(--ink)]"
          }`}
        >
          {t(label)}
        </Link>
      ))}
    </nav>
  ) : null;

  if (view === "obligations") {
    const board = await agreementBoard(writable ? undefined : user.id);
    const companyOptions = await companies();
    const groups: [MessageKey, AgreementRow[], boolean][] = [
      ["crm.overdue", board.overdue, true],
      ["crm.today", board.todayList, false],
      ["crm.soon", board.soon, false],
      ["crm.later", board.later, false],
      ["crm.noDeadline", board.noDeadline, false],
    ];
    const total = groups.reduce((sum, [, rows]) => sum + rows.length, 0);

    return (
      <>
        {tabs}
        {writable ? (
          <NewAgreement
            companies={companyOptions.map((company) => ({
              id: company.id,
              name: company.name,
            }))}
            staff={(await assignableUsers(user)).map((person) => ({
              id: person.id,
              full_name: person.full_name,
            }))}
          />
        ) : (
          <PageHeader
            title={t("crm.agreements")}
            description={t("crm.agreementsDesc")}
          />
        )}

        {total === 0 ? (
          <EmptyState text={t("crm.noAgreements")} icon="check" />
        ) : (
          <div className="space-y-5">
            {groups
              .filter(([, rows]) => rows.length > 0)
              .map(([key, rows, urgent]) => (
                <Panel
                  key={key}
                  title={`${t(key)} · ${rows.length}`}
                  className={urgent ? "ring-1 ring-rose-500/20" : ""}
                >
                  <ul className="divide-y">
                    {rows.map((agreement) => (
                      <AgreementRowItem
                        key={agreement.id}
                        agreement={agreement}
                        canSettle={writable || agreement.owner_user_id === user.id}
                      />
                    ))}
                  </ul>
                </Panel>
              ))}
          </div>
        )}
      </>
    );
  }

  /* ---- The register ------------------------------------------------ */

  const status = (FILTERS as string[]).includes(params.status ?? "")
    ? (params.status as KelishuvFilter)
    : "ALL";
  const query = (params.q ?? "").trim().slice(0, 120);
  const page = Math.max(0, Number.parseInt(params.page ?? "0", 10) || 0);
  const { rows, total, counts } = await searchKelishuvlar({ status, query, page });

  const hrefFor = (next: { status?: KelishuvFilter; page?: number }) => {
    const search = new URLSearchParams();
    const s = next.status ?? status;
    if (s !== "ALL") search.set("status", s);
    if (query) search.set("q", query);
    if (next.page) search.set("page", String(next.page));
    const string = search.toString();
    return string ? `/agreements?${string}` : "/agreements";
  };
  const from = page * KELISHUV_PAGE;

  return (
    <>
      {tabs}
      <PageHeader
        title={t("kelishuv.title")}
        description={t("kelishuv.subtitle")}
        action={
          <Button href="/agreements/new" icon="plus">
            {t("kelishuv.new")}
          </Button>
        }
      />

      <form method="get" action="/agreements" role="search" className="mb-3 flex gap-2">
        {status !== "ALL" && <input type="hidden" name="status" value={status} />}
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={t("kelishuv.searchPlaceholder")}
          aria-label={t("kelishuv.searchPlaceholder")}
          className={FIELD}
        />
        <Button type="submit" variant="secondary" icon="search">
          {t("common.search")}
        </Button>
      </form>

      <nav className="mb-4 flex flex-wrap gap-1.5" aria-label={t("kelishuv.field.status")}>
        {FILTERS.map((filter) => (
          <Link
            key={filter}
            href={hrefFor({ status: filter, page: 0 })}
            aria-current={filter === status ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition duration-150 ${
              filter === status
                ? "bg-navy-900 text-white dark:bg-navy-600"
                : "border hover:bg-[var(--surface)]"
            }`}
          >
            {t(`kelishuv.status.${filter}` as MessageKey)}
            <span className="ml-1.5 tabular-nums opacity-60">{counts[filter]}</span>
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        query ? (
          <EmptyState
            icon="search"
            text={t("kelishuv.noResults").replace("{q}", query)}
            hint={t("meeting.noResultsHint")}
          />
        ) : status !== "ALL" ? (
          <EmptyState icon="check" text={t("kelishuv.emptyFiltered")} />
        ) : (
          <EmptyState
            icon="file"
            text={t("kelishuv.empty")}
            hint={t("kelishuv.emptyHint")}
            action={
              <Button href="/agreements/new" icon="plus">
                {t("kelishuv.new")}
              </Button>
            }
          />
        )
      ) : (
        <>
          <p className="muted mb-2 text-xs tabular-nums">
            {t("kelishuv.count").replace("{n}", String(total))}
          </p>
          <Panel>
            <ul className="divide-y">
              {rows.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/agreements/${row.id}`}
                    className="flex gap-3 px-4 py-3 transition duration-150 hover:bg-[var(--surface)] lg:gap-4 lg:px-5"
                  >
                    <span className="muted w-20 shrink-0 pt-0.5 text-xs tabular-nums">
                      {formatDate(row.happened)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-medium">{row.title}</span>
                        {row.kind && (
                          <Badge className={NEUTRAL_TONE}>
                            {t(`kelishuv.kind.${row.kind}` as MessageKey)}
                          </Badge>
                        )}
                        <Badge className={kelishuvTone(row.view)}>
                          {t(`kelishuv.status.${row.view}` as MessageKey)}
                        </Badge>
                        {missingKelishuv(row).length > 0 && (
                          <Badge className={INCOMPLETE_TONE}>
                            {t("meeting.incomplete")}
                          </Badge>
                        )}
                      </span>
                      {row.parties && (
                        <span className="muted mt-0.5 block text-xs">{row.parties}</span>
                      )}
                      {row.content && (
                        <span className="mt-1 line-clamp-2 block text-sm leading-snug">
                          {row.content}
                        </span>
                      )}
                    </span>
                    <span className="hidden shrink-0 text-right sm:block">
                      {row.amount !== null && (
                        <span className="block text-sm font-medium tabular-nums">
                          {formatNumber(row.amount)} {row.currency}
                        </span>
                      )}
                      {row.open_obligations > 0 && (
                        <span className="muted block text-[11px] tabular-nums">
                          {t("kelishuv.openObligations").replace(
                            "{n}",
                            String(row.open_obligations),
                          )}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          {total > KELISHUV_PAGE && (
            <nav className="mt-4 flex items-center justify-between gap-3">
              {page > 0 ? (
                <Button href={hrefFor({ page: page - 1 })} variant="secondary" size="sm">
                  {t("meeting.prev")}
                </Button>
              ) : (
                <span />
              )}
              <span className="muted text-xs tabular-nums">
                {t("meeting.range")
                  .replace("{from}", String(from + 1))
                  .replace("{to}", String(from + rows.length))
                  .replace("{total}", String(total))}
              </span>
              {from + rows.length < total ? (
                <Button href={hrefFor({ page: page + 1 })} variant="secondary" size="sm">
                  {t("meeting.next")}
                </Button>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </>
  );
}
