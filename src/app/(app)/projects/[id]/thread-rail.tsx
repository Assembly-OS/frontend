import { Icon } from "@/components/icons";
import { formatDate } from "@/lib/format";
import type { ThreadRow } from "@/lib/project-threads";
import { THREAD_ICON } from "../tone";

/**
 * The threads of a project, as a list you can read down.
 *
 * Ordered by last activity rather than alphabetically, and that is the whole
 * design. A project with eleven counterparts is not eleven equal things: two
 * of them moved this week and the rest are quiet, and an alphabetical list
 * hides exactly that. The date on the right is the answer to "is anything
 * happening here", so it is the one number given room.
 *
 * `current` renders the same list as a navigation rail beside an open thread,
 * with the open one marked. One component, because a second copy of it would
 * drift the moment either changed.
 */
export function ThreadRail({
  projectId,
  threads,
  noActivityLabel,
  current,
  compact = false,
}: {
  projectId: number;
  threads: ThreadRow[];
  /** Passed in rather than translated here: this renders inside a Server
   *  Component, and reaching for the client provider would drag the rail —
   *  and the page around it — across the boundary for one string. */
  noActivityLabel: string;
  current?: number;
  compact?: boolean;
}) {
  return (
    <ul className={compact ? "" : "divide-y"}>
      {threads.map((thread) => {
        const active = thread.id === current;
        return (
          <li key={thread.id}>
            <a
              href={`/projects/${projectId}/${thread.id}`}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 transition duration-150 ${
                compact ? "rounded-lg px-3 py-2" : "px-5 py-3"
              } ${
                active
                  ? "bg-[var(--surface)] font-semibold"
                  : "hover:bg-[var(--surface)]"
              }`}
            >
              <Icon
                name={THREAD_ICON[thread.kind] ?? "chat"}
                className="muted size-4 shrink-0"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{thread.title}</span>
                {/* The one line saying where this stands. Falls back to the
                    company name — never to nothing, because a rail of bare
                    titles gives a newcomer no way in. */}
                {!compact && (thread.summary || thread.company_name) && (
                  <span className="muted block truncate text-xs">
                    {thread.summary ?? thread.company_name}
                  </span>
                )}
              </span>
              <span className="muted shrink-0 text-[11px] tabular-nums">
                {thread.last_entry_at
                  ? formatDate(thread.last_entry_at)
                  : noActivityLabel}
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
