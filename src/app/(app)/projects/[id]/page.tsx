import { notFound } from "next/navigation";
import { createTranslator, type MessageKey } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { canManageProjects } from "@/lib/project-access";
import { projectById, projectPulse, threadsOf } from "@/lib/project-threads";
import { viewStatus } from "@/lib/crm";
import { formatDate } from "@/lib/format";
import {
  Badge,
  EmptyState,
  MetricStrip,
  PageHeader,
  Panel,
} from "@/components/ui";
import { WaitingRow } from "@/components/acceptance";
import { AGREEMENT_TONE } from "../../companies/tone";
import { PROJECT_TONE } from "../tone";
import { NewThread } from "./new-thread";
import { ThreadRail } from "./thread-rail";
import { id as parseId } from "@/lib/validate";

export const dynamic = "force-dynamic";

/**
 * One project, opened on its answer.
 *
 * The brief was "a person should understand in seconds what is happening
 * here", and that ruled out the obvious layout. A row of tabs — Overview,
 * Companies, Meetings, Tasks — is what most tools put at the top of a
 * project, and it answers the question with "click around and find out".
 * Everything that matters is on this one screen instead: the threads down the
 * main column in the order they were last touched, and beside them the three
 * things actually waiting on somebody.
 *
 * `items-start` on the grid is load-bearing. The two columns are unrelated
 * heights, and without it a short right-hand column is stretched to match the
 * threads and renders as a panel of dead space.
 */
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const locale = await currentLocale(user);
  const t = createTranslator(locale);

  const projectId = parseId((await params).id);
  const project = projectId ? await projectById(projectId) : undefined;
  if (!project) notFound();

  const [threads, pulse] = await Promise.all([
    threadsOf(project.id),
    projectPulse(project.id),
  ]);
  const mayManage = canManageProjects(user);

  const facts: [string, string | null][] = [
    [t("proj.field.stage"), project.stage],
    [t("proj.field.owner"), project.owner_full_name],
    [
      t("proj.field.started"),
      project.started_at && formatDate(project.started_at),
    ],
    [t("proj.field.deadline"), project.deadline && formatDate(project.deadline)],
    [
      t("proj.lastActivity"),
      project.last_activity ? formatDate(project.last_activity) : null,
    ],
  ];
  const shown = facts.filter(([, value]) => value);

  return (
    <>
      <PageHeader
        title={project.name}
        description={project.description ?? undefined}
        action={
          mayManage ? (
            <NewThread projectId={project.id} label={t("proj.newThread")} />
          ) : undefined
        }
      />

      {/* Status and the handful of dates as one line of facts rather than
          five cards. Five cards of one word each is five boxes of whitespace,
          and it pushes the threads below the fold on a phone. */}
      <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Badge className={PROJECT_TONE[project.status] ?? PROJECT_TONE.REJA}>
          {t(`proj.status.${project.status}` as MessageKey)}
        </Badge>
        {shown.map(([label, value]) => (
          <p key={label} className="text-xs">
            <span className="muted">{label}: </span>
            <span className="font-medium">{value}</span>
          </p>
        ))}
      </div>

      {/* Full width, above the columns. Inside the third-width column the
          strip had four cells of about eighty pixels and truncated its own
          labels to "Проср…" — a number with no idea what it counts. */}
      <div className="mb-6">
        <MetricStrip
          items={[
            { label: t("proj.overdue"), value: pulse.tasks.overdue },
            {
              label: t("proj.awaiting"),
              value: pulse.tasks.awaitingAcceptance,
            },
            { label: t("proj.inProgress"), value: pulse.tasks.inProgress },
            { label: t("proj.done"), value: pulse.tasks.done },
          ]}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel
            title={t("proj.threads")}
            action={
              <span className="muted text-xs tabular-nums">
                {threads.length}
              </span>
            }
          >
            {threads.length === 0 ? (
              <EmptyState
                bare
                icon="chat"
                text={t("proj.noThreads")}
                hint={t("proj.noThreadsHint")}
                action={
                  mayManage ? (
                    <NewThread
                      projectId={project.id}
                      label={t("proj.newThread")}
                    />
                  ) : undefined
                }
              />
            ) : (
              <ThreadRail
                projectId={project.id}
                threads={threads}
                noActivityLabel={t("proj.noActivity")}
              />
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          {/* The block the whole acceptance feature exists for: assignments
              that have been handed out and that nobody has taken on. */}
          <Panel title={t("proj.waitingTitle")}>
            {pulse.waiting.length === 0 ? (
              <EmptyState bare icon="check" text={t("proj.waitingEmpty")} />
            ) : (
              <ul className="divide-y">
                {pulse.waiting.map((task) => (
                  <li key={task.id} className="px-5 py-3">
                    <WaitingRow
                      title={task.title}
                      assignee={task.assignee}
                      seen={Boolean(task.seen_at)}
                      t={t}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t("proj.openAgreements")}>
            {pulse.openAgreements.length === 0 ? (
              <EmptyState bare icon="check" text={t("proj.noAgreements")} />
            ) : (
              <ul className="divide-y">
                {pulse.openAgreements.map((agreement) => {
                  const view = viewStatus(agreement.status, agreement.deadline);
                  return (
                    <li key={agreement.id} className="px-5 py-3">
                      <p className="text-sm">{agreement.description}</p>
                      <p className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Badge className={AGREEMENT_TONE[view]}>
                          {t(`crm.agr.${view}` as MessageKey)}
                        </Badge>
                        {agreement.deadline && (
                          <span className="muted text-[11px] tabular-nums">
                            {formatDate(agreement.deadline)}
                          </span>
                        )}
                        {agreement.company_name && (
                          <span className="muted truncate text-[11px]">
                            {agreement.company_name}
                          </span>
                        )}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
