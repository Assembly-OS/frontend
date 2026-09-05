import { createTranslator, type MessageKey } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { canManageProjects } from "@/lib/project-access";
import { projectList } from "@/lib/project-threads";
import { formatDate } from "@/lib/format";
import { Badge, EmptyState, PageHeader, Panel } from "@/components/ui";
import { Icon } from "@/components/icons";
import { PROJECT_TONE } from "./tone";
import { NewProject } from "./new-project";

export const dynamic = "force-dynamic";

/**
 * Every project the Assembly is running, ordered by what was touched last.
 *
 * A grid of cards was the obvious shape and the wrong one. The question this
 * page answers is "which of these needs me today", and that is a comparison
 * between rows: cards put each project in its own box and make the reader
 * compare across gutters. A list puts the two numbers that matter — nobody
 * has accepted this, this is late — in one column down the page, where the
 * eye finds them without being told to look.
 */
export default async function ProjectsPage() {
  const user = await requireUser();
  const locale = await currentLocale(user);
  const t = createTranslator(locale);
  const projects = await projectList();
  const mayManage = canManageProjects(user);

  return (
    <>
      <PageHeader
        title={t("proj.title")}
        description={t("proj.subtitle")}
        action={mayManage ? <NewProject label={t("proj.new")} /> : undefined}
      />

      {projects.length === 0 ? (
        <EmptyState
          icon="folder"
          text={t("proj.empty")}
          hint={t("proj.emptyHint")}
          action={mayManage ? <NewProject label={t("proj.new")} /> : undefined}
        />
      ) : (
        <Panel>
          <ul>
            {projects.map((project) => (
              <li key={project.id} className="border-b last:border-b-0">
                <a
                  href={`/projects/${project.id}`}
                  className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 py-4 transition duration-150 hover:bg-[var(--surface)]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold">
                        {project.name}
                      </span>
                      <Badge
                        className={PROJECT_TONE[project.status] ?? PROJECT_TONE.REJA}
                      >
                        {t(`proj.status.${project.status}` as MessageKey)}
                      </Badge>
                    </div>
                    {project.description && (
                      <p className="muted mt-1 line-clamp-1 text-xs">
                        {project.description}
                      </p>
                    )}
                    <p className="muted mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                      <span className="tabular-nums">
                        {project.thread_count} {t("proj.threadsCount")}
                      </span>
                      <span>
                        {project.last_activity
                          ? `${t("proj.lastActivity")} ${formatDate(project.last_activity)}`
                          : t("proj.noActivity")}
                      </span>
                      {project.owner_full_name && (
                        <span className="truncate">{project.owner_full_name}</span>
                      )}
                    </p>
                  </div>

                  {/* The two counts that decide whether this row gets opened
                      today. Silent when there is nothing to answer for — a
                      zero badge is a badge carrying no information. */}
                  <div className="flex shrink-0 items-center gap-3">
                    {project.awaiting_acceptance > 0 && (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                        <Icon name="clock" className="size-4" />
                        <span className="tabular-nums">
                          {project.awaiting_acceptance}
                        </span>
                        <span className="sr-only">{t("proj.awaiting")}</span>
                      </span>
                    )}
                    {project.overdue_tasks > 0 && (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                        <Icon name="alert" className="size-4" />
                        <span className="tabular-nums">
                          {project.overdue_tasks}
                        </span>
                        <span className="sr-only">{t("proj.overdue")}</span>
                      </span>
                    )}
                    <Icon name="chevron" className="muted size-4 -rotate-90" />
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
