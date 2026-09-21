import Link from "next/link";
import { redirect } from "next/navigation";
import { createTranslator, type MessageKey } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { canWrite } from "@/lib/crm-access";
import { MEETING_PAGE, missingFields, searchMeetings } from "@/lib/meetings";
import { formatDate } from "@/lib/format";
import { get } from "@/lib/pg";
import { id as parseId } from "@/lib/validate";
import { INCOMPLETE_TONE, legalTone } from "@/lib/types";
import {
  Badge,
  Button,
  EmptyState,
  FIELD,
  PageHeader,
  Panel,
} from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * The meeting register: who the Assembly met, when, and what was agreed.
 *
 * It used to be a feed of AI conclusions with no way to find a meeting except
 * scrolling. The TZ's test for block 1 is plain — search by a company's name
 * and every meeting with it comes back, by date — so the search box is the
 * first thing on the page and a plain GET form: it works before any script
 * loads, and the address of a search can be sent to a colleague.
 *
 * Each row leads with what was agreed, falling back to the stored conclusion
 * for meetings analysed before that field existed. An incomplete record is
 * marked on its row so the gap is seen from the list, not only on opening it.
 *
 * Paged on the server, thirty at a time.
 */
export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; project?: string }>;
}) {
  const user = await requireUser();
  // The people who may file a meeting are the people who may look one up.
  if (!canWrite(user)) redirect("/dashboard");

  const locale = await currentLocale(user);
  const t = createTranslator(locale);
  const lang = locale === "ru" ? "ru" : locale === "en" ? "en" : "uz";

  const params = await searchParams;
  const query = (params.q ?? "").trim().slice(0, 120);
  const page = Math.max(0, Number.parseInt(params.page ?? "0", 10) || 0);
  // Reached from a project's card: its meetings, and a way back to all.
  const projectId = parseId(params.project);
  const project = projectId
    ? await get<{ code: string; name: string }>(
        "SELECT code, name FROM loyihalar WHERE id = ?",
        projectId,
      )
    : undefined;
  const { rows, total } = await searchMeetings({
    query,
    lang,
    page,
    projectId: project ? projectId : null,
  });

  const from = page * MEETING_PAGE;
  const hrefFor = (target: number) => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (project && projectId) search.set("project", String(projectId));
    if (target > 0) search.set("page", String(target));
    const string = search.toString();
    return string ? `/meetings?${string}` : "/meetings";
  };

  return (
    <>
      <PageHeader
        title={t("meetings.title")}
        description={t("meetings.subtitle")}
        action={
          <Button href="/meetings/new" icon="plus">
            {t("crm.newMeeting")}
          </Button>
        }
      />

      <form method="get" action="/meetings" role="search" className="mb-4 flex gap-2">
        {project && projectId && (
          <input type="hidden" name="project" value={projectId} />
        )}
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={t("meeting.searchPlaceholder")}
          aria-label={t("meeting.searchPlaceholder")}
          className={FIELD}
        />
        <Button type="submit" variant="secondary" icon="search">
          {t("common.search")}
        </Button>
      </form>

      {project && (
        <p className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="font-medium">
            {t("meeting.filteredBy").replace("{name}", `${project.code} · ${project.name}`)}
          </span>
          <Link
            href={query ? `/meetings?q=${encodeURIComponent(query)}` : "/meetings"}
            className="muted hover:underline"
          >
            {t("meeting.clearFilter")}
          </Link>
        </p>
      )}

      {rows.length === 0 ? (
        query ? (
          <EmptyState
            icon="search"
            text={t("meeting.noResults").replace("{q}", query)}
            hint={t("meeting.noResultsHint")}
          />
        ) : (
          <EmptyState
            icon="calendar"
            text={t("meetings.empty")}
            hint={t("meeting.emptyHint")}
            action={
              <Button href="/meetings/new" icon="plus">
                {t("crm.newMeeting")}
              </Button>
            }
          />
        )
      ) : (
        <>
          <p className="muted mb-2 text-xs tabular-nums">
            {t("meeting.count").replace("{n}", String(total))}
          </p>
          <Panel>
            <ul className="divide-y">
              {rows.map((row) => {
                const incomplete = missingFields(row).length > 0;
                const gist = row.agreed?.trim() || row.summary;
                return (
                  <li key={row.id}>
                    <Link
                      href={`/meetings/${row.id}`}
                      className="flex gap-3 px-4 py-3 transition duration-150 hover:bg-[var(--surface)] lg:gap-4 lg:px-5"
                    >
                      <span className="muted w-20 shrink-0 pt-0.5 text-xs tabular-nums">
                        {formatDate(row.happened)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-medium">{row.title}</span>
                          {row.legal_status && (
                            <Badge className={legalTone(row.legal_status)}>
                              {t(`meeting.legal.${row.legal_status}` as MessageKey)}
                            </Badge>
                          )}
                          {incomplete && (
                            <Badge className={INCOMPLETE_TONE}>
                              {t("meeting.incomplete")}
                            </Badge>
                          )}
                        </span>
                        {row.company_name && (
                          <span className="muted mt-0.5 block text-xs">
                            {row.company_name}
                          </span>
                        )}
                        {gist && (
                          <span className="mt-1 line-clamp-2 block text-sm leading-snug">
                            {gist}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>

          {total > MEETING_PAGE && (
            <nav className="mt-4 flex items-center justify-between gap-3">
              {page > 0 ? (
                <Button href={hrefFor(page - 1)} variant="secondary" size="sm">
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
                <Button href={hrefFor(page + 1)} variant="secondary" size="sm">
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
