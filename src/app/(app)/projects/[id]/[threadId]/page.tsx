import { notFound } from "next/navigation";
import { createTranslator } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { canEditEntry } from "@/lib/project-access";
import {
  entriesOf,
  entryDay,
  pinnedOf,
  projectById,
  threadById,
  threadsOf,
  type EntryRow,
} from "@/lib/project-threads";
import { assignableUsers } from "@/lib/queries";
import { formatBytes, formatDate, formatDateTime } from "@/lib/format";
import { Badge, EmptyState, Panel } from "@/components/ui";
import { Icon } from "@/components/icons";
import { AcceptanceTrail } from "@/components/acceptance";
import { Linkify } from "@/components/linkify";
import { ENTRY_ICON } from "../../tone";
import { ThreadRail } from "../thread-rail";
import { Composer } from "./composer";
import { EntryActions } from "./entry-actions";
import { id as parseId } from "@/lib/validate";

export const dynamic = "force-dynamic";

/**
 * One thread: everything that has happened with this counterpart, in order.
 *
 * This is the screen the whole feature exists for. Somebody who was in none
 * of the meetings opens `Smart City → UNIDO` and has to leave knowing where
 * things stand — so it is built as a record, not as a conversation. No
 * bubbles, no sides, no read receipts: entries are full width, dated by the
 * day the thing happened, and marked by what kind of thing it was, which is
 * what lets a year of it be skimmed in seconds.
 */
export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string; threadId: string }>;
}) {
  const user = await requireUser();
  const locale = await currentLocale(user);
  const t = createTranslator(locale);

  const raw = await params;
  const projectId = parseId(raw.id);
  const threadId = parseId(raw.threadId);
  const [project, thread] = await Promise.all([
    projectId ? projectById(projectId) : undefined,
    threadId ? threadById(threadId) : undefined,
  ]);
  // The thread must belong to the project in the URL, or `/projects/1/99`
  // would happily render another project's history under this one's name.
  if (!project || !thread || thread.project_id !== project.id) notFound();

  const [entries, pinned, threads, staff] = await Promise.all([
    entriesOf(thread.id),
    pinnedOf(thread.id),
    threadsOf(project.id),
    assignableUsers(user),
  ]);

  // Grouped in one pass rather than by filtering per day: a thread with a
  // thousand entries would otherwise walk the list once for every date on it.
  const days: { day: string; entries: EntryRow[] }[] = [];
  for (const entry of entries) {
    const day = entryDay(entry);
    const last = days[days.length - 1];
    if (last && last.day === day) last.entries.push(entry);
    else days.push({ day, entries: [entry] });
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[16rem_1fr]">
      {/* The rail is the sidebar from the brief. It is hidden below `lg`
          rather than stacked: on a 360px screen a list of eleven threads
          above the one you opened is eleven rows of scrolling to reach the
          thing you asked for. The back link does that job there. */}
      <aside className="hidden lg:block">
        <Panel title={project.name}>
          <div className="p-2">
            <ThreadRail
              projectId={project.id}
              threads={threads}
              noActivityLabel={t("proj.noActivity")}
              current={thread.id}
              compact
            />
          </div>
        </Panel>
      </aside>

      <div className="min-w-0">
        <a
          href={`/projects/${project.id}`}
          className="muted mb-3 inline-flex items-center gap-1.5 text-xs font-medium hover:text-[var(--ink)] lg:hidden"
        >
          <Icon name="chevron" className="size-4 rotate-90" />
          {project.name}
        </a>

        <div className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
              {thread.title}
            </h1>
            {thread.summary && (
              <p className="muted mt-1 max-w-2xl text-sm">{thread.summary}</p>
            )}
          </div>
          {thread.company_id && thread.company_name && (
            <a
              href={`/companies/${thread.company_id}`}
              className="muted inline-flex items-center gap-1.5 text-xs font-medium hover:text-[var(--ink)]"
            >
              <Icon name="users" className="size-4" />
              {thread.company_name}
            </a>
          )}
        </div>

        {pinned.length > 0 && (
          <Panel title={t("thread.pinned")} className="mb-6">
            <ul className="divide-y">
              {pinned.map((entry) => (
                <li key={entry.id} className="px-5 py-3">
                  <p className="line-clamp-2 text-sm">{entry.body}</p>
                  <p className="muted mt-1 text-[11px] tabular-nums">
                    {formatDate(entryDay(entry))}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {days.length === 0 ? (
          <EmptyState
            icon="chat"
            text={t("thread.empty")}
            hint={t("thread.emptyHint")}
          />
        ) : (
          <div className="space-y-6">
            {days.map(({ day, entries: dayEntries }) => (
              <section key={day}>
                {/* The date is the heading, not a label above one: a journal
                    is read by day, and the day has to be findable when
                    scrolling through months of it. */}
                <h2 className="muted mb-3 text-[11px] font-semibold uppercase tracking-wide">
                  {formatDate(day)}
                </h2>

                <ol className="ml-2 space-y-4 border-l">
                  {dayEntries.map((entry) => (
                    <li key={entry.id} className="relative pl-6">
                      <span
                        aria-hidden
                        className="absolute -left-[11px] top-0.5 grid size-[22px] place-items-center rounded-full border bg-[var(--panel)]"
                      >
                        <Icon
                          name={ENTRY_ICON[entry.kind] ?? "chat"}
                          className="muted size-3"
                        />
                      </span>

                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-xs font-semibold">
                          {entry.author_full_name}
                        </span>
                        <span className="muted text-[11px] tabular-nums">
                          {formatDateTime(entry.created_at)}
                        </span>
                        {entry.occurred_on && (
                          <span className="muted text-[11px]">
                            {t("thread.recordedLater")}
                          </span>
                        )}
                        {entry.edited_at && (
                          <span className="muted text-[11px]">
                            {t("thread.edited")}
                          </span>
                        )}
                        {entry.is_pinned === 1 && (
                          <Icon name="pin" className="muted size-3" />
                        )}
                        <span className="ml-auto">
                          <EntryActions
                            entryId={entry.id}
                            pinned={entry.is_pinned === 1}
                            body={entry.body}
                            mayEdit={canEditEntry(user, entry.author_id)}
                          />
                        </span>
                      </div>

                      {entry.body && (
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                          <Linkify text={entry.body} />
                        </p>
                      )}

                      {entry.link_url && (
                        <a
                          href={entry.link_url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-navy-700 hover:underline dark:text-navy-300"
                        >
                          <Icon name="link" className="size-3.5" />
                          <span className="truncate">{entry.link_url}</span>
                        </a>
                      )}

                      {entry.file_key && entry.file_name && (
                        <a
                          href={`/api/files/${encodeURIComponent(entry.file_key)}`}
                          className="mt-1.5 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition duration-150 hover:bg-[var(--surface)]"
                        >
                          <Icon name="paperclip" className="muted size-4" />
                          <span className="truncate font-medium">
                            {entry.file_name}
                          </span>
                          <span className="muted tabular-nums">
                            {formatBytes(entry.file_size)}
                          </span>
                        </a>
                      )}

                      {/* What the entry produced. The agreement carries the
                          deadline; the task carries the acceptance trail —
                          the answer to "did anyone pick this up". */}
                      {entry.agreement_id && entry.agreement_text && (
                        <div className="mt-2 rounded-xl border px-3 py-2">
                          <p className="flex flex-wrap items-center gap-2 text-xs">
                            <Badge className="bg-[var(--surface)] ring-[var(--line)]">
                              {t("thread.agreement")}
                            </Badge>
                            <span className="font-medium">
                              {entry.agreement_text}
                            </span>
                            {entry.agreement_deadline && (
                              <span className="muted tabular-nums">
                                {formatDate(entry.agreement_deadline)}
                              </span>
                            )}
                          </p>
                        </div>
                      )}

                      {entry.task_id && entry.task_title && (
                        <div className="mt-2 rounded-xl border px-3 py-2">
                          <p className="flex flex-wrap items-center gap-2 text-xs">
                            <Badge className="bg-[var(--surface)] ring-[var(--line)]">
                              {t("thread.task")}
                            </Badge>
                            <span className="font-medium">
                              {entry.task_title}
                            </span>
                            {entry.task_assignee && (
                              <span className="muted">
                                {entry.task_assignee}
                              </span>
                            )}
                            {entry.task_deadline && (
                              <span className="muted tabular-nums">
                                {formatDate(entry.task_deadline)}
                              </span>
                            )}
                          </p>
                          <div className="mt-1.5">
                            <AcceptanceTrail
                              createdAt={entry.created_at}
                              seenAt={entry.task_seen_at}
                              acceptedAt={entry.task_accepted_at}
                              status={entry.task_status ?? "YANGI"}
                              t={t}
                            />
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}

        <div className="mt-6">
          <Composer
            threadId={thread.id}
            projectId={project.id}
            staff={staff.map((person) => ({
              id: person.id,
              name: person.full_name,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
