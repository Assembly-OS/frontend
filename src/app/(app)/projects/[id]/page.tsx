import Link from "next/link";
import { notFound } from "next/navigation";
import { createTranslator, type MessageKey } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { canManageProjects } from "@/lib/project-access";
import { canWrite } from "@/lib/crm-access";
import { searchMeetings } from "@/lib/meetings";
import { projectById, projectPulse, threadsOf } from "@/lib/project-threads";
import { viewStatus } from "@/lib/crm";
import { formatDate, formatNumber } from "@/lib/format";
import {
  PHASE_STATUS,
  clusterName,
  inLocale,
  isDraft,
  missingPassport,
  type Phase,
} from "@/lib/project-passport";
import { INCOMPLETE_TONE, NEUTRAL_TONE } from "@/lib/types";
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
import { ProjectMemory } from "@/components/project-memory";
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

  // Meetings are read by the people who may file them; to anyone else the
  // panel would be a list of links that lead nowhere.
  const readsMeetings = canWrite(user);
  const [threads, pulse, meetings] = await Promise.all([
    threadsOf(project.id),
    projectPulse(project.id),
    readsMeetings
      ? searchMeetings({ projectId: project.id })
      : Promise.resolve({ rows: [], total: 0 }),
  ]);
  const mayManage = canManageProjects(user);

  // The line under the title keeps to what changes week to week — where the
  // project stands and when it last moved. Who leads it, its dates and its
  // shares are the passport, beside the threads.
  const facts: [string, string | null][] = [
    [t("proj.field.stage"), project.stage],
    [
      t("proj.lastActivity"),
      project.last_activity ? formatDate(project.last_activity) : null,
    ],
  ];
  const shown = facts.filter(([, value]) => value);

  const missing = missingPassport(project);
  const draft = isDraft(project);
  const name = inLocale(locale, project.name, project.name_ru, project.name_en) ?? project.name;
  const about = inLocale(locale, project.description, project.description_ru, project.description_en);
  const person = (full: string | null, typed: string | null) => full ?? typed;
  const shares =
    project.ppp_state !== null || project.ppp_public !== null || project.ppp_private !== null
      ? (
          [
            ["proj.passport.pppState", project.ppp_state, project.ppp_state_party],
            ["proj.passport.pppPublic", project.ppp_public, project.ppp_public_party],
            ["proj.passport.pppPrivate", project.ppp_private, project.ppp_private_party],
          ] as const
        )
      : null;
  const passport: [string, string | null][] = [
    [
      t("proj.field.klaster"),
      clusterName(locale, {
        uz: project.klaster_uz,
        uzc: project.klaster_uzc,
        ru: project.klaster_ru,
        en: project.klaster_en,
      }),
    ],
    [t("proj.field.leader"), person(project.owner_full_name, project.leader_name)],
    [t("proj.field.deputy"), person(project.deputy_full_name, project.deputy_name)],
    [t("proj.field.nextDecision"), project.next_decision_on && formatDate(project.next_decision_on)],
    [t("proj.field.started"), project.started_at && formatDate(project.started_at)],
    [t("proj.field.targetEnd"), project.deadline && formatDate(project.deadline)],
    [t("proj.field.budget"), project.budget ? formatNumber(project.budget) : null],
  ];

  return (
    <>
      <PageHeader
        title={name}
        description={about ?? undefined}
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
        {/* The phase when the passport has one; the older status until then,
            so a project nobody has touched yet does not lose its badge. The
            tone is the status's either way, so the colours people know stay. */}
        {project.phase ? (
          <Badge className={PROJECT_TONE[PHASE_STATUS[project.phase as Phase]] ?? PROJECT_TONE.REJA}>
            {t(`proj.phase.${project.phase}` as MessageKey)}
          </Badge>
        ) : (
          <Badge className={PROJECT_TONE[project.status] ?? PROJECT_TONE.REJA}>
            {t(`proj.status.${project.status}` as MessageKey)}
          </Badge>
        )}
        {project.tier && (
          <Badge className={NEUTRAL_TONE}>{t(`proj.tier.${project.tier}` as MessageKey)}</Badge>
        )}
        {draft && <Badge className={INCOMPLETE_TONE}>{t("proj.draft")}</Badge>}
        {shown.map(([label, value]) => (
          <p key={label} className="text-xs">
            <span className="muted">{label}: </span>
            <span className="font-medium">{value}</span>
          </p>
        ))}
      </div>

      {/* The memory, before the numbers. Somebody arriving with a question
          in mind should not have to scroll past four counters to ask it. */}
      <div className="mb-6">
        <ProjectMemory
          projectId={project.id}
          scopeLabel={t("memory.scopeProject")}
        />
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
          {/* The passport, block 1.3 of the TZ. What is missing is said once,
              at the foot, in the words of the fields; the rows themselves only
              show what is known, so a half-filled passport reads as half, not
              as a column of dashes. */}
          <Panel
            title={t("proj.passport.title")}
            action={
              mayManage ? (
                <Link
                  href={`/projects/${project.id}/passport`}
                  className="muted text-xs font-medium hover:underline"
                >
                  {t("proj.passport.edit")}
                </Link>
              ) : undefined
            }
          >
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4">
              {passport
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="muted text-[11px]">{label}</dt>
                    <dd className="mt-0.5 text-sm tabular-nums">{value}</dd>
                  </div>
                ))}
              {shares && (
                <div className="col-span-2">
                  <dt className="muted text-[11px]">{t("proj.passport.ppp")}</dt>
                  <dd className="mt-1 space-y-0.5 text-sm">
                    {shares.map(([label, share, party]) => (
                      <p key={label} className="flex gap-2">
                        <span className="w-10 shrink-0 text-right font-medium tabular-nums">
                          {share ?? "—"}%
                        </span>
                        <span className="min-w-0 truncate">
                          {t(label)}
                          {party && <span className="muted"> · {party}</span>}
                        </span>
                      </p>
                    ))}
                  </dd>
                </div>
              )}
              {project.first_result && (
                <div className="col-span-2">
                  <dt className="muted text-[11px]">{t("proj.field.firstResult")}</dt>
                  <dd className="mt-0.5 text-sm">{project.first_result}</dd>
                </div>
              )}
            </dl>
            {missing.length > 0 && (
              <p className="flex flex-wrap items-center gap-2 border-t px-5 py-3 text-xs">
                <Badge className={INCOMPLETE_TONE}>{t("meeting.incomplete")}</Badge>
                <span className="muted">
                  {t("meeting.missingList").replace(
                    "{fields}",
                    missing.map((field) => t(`proj.passport.missing.${field}` as MessageKey)).join(", "),
                  )}
                </span>
              </p>
            )}
          </Panel>

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

          {/* The TZ: a meeting shows on its project's card by itself. The
              last five, newest first, and the way to the rest. */}
          {readsMeetings && (
            <Panel
              title={t("meetings.title")}
              action={
                <Link
                  href={`/meetings/new?project=${project.id}`}
                  className="muted text-xs font-medium hover:underline"
                >
                  {t("crm.newMeeting")}
                </Link>
              }
            >
              {meetings.rows.length === 0 ? (
                <EmptyState bare icon="calendar" text={t("meeting.noneForProject")} />
              ) : (
                <ul className="divide-y">
                  {meetings.rows.slice(0, 5).map((meeting) => (
                    <li key={meeting.id}>
                      <Link
                        href={`/meetings/${meeting.id}`}
                        className="block px-5 py-3 transition duration-150 hover:bg-[var(--surface)]"
                      >
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="min-w-0 truncate text-sm font-medium">
                            {meeting.title}
                          </span>
                          <span className="muted shrink-0 text-[11px] tabular-nums">
                            {formatDate(meeting.happened)}
                          </span>
                        </span>
                        {meeting.company_name && (
                          <span className="muted mt-0.5 block truncate text-[11px]">
                            {meeting.company_name}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                  {meetings.total > 5 && (
                    <li>
                      <Link
                        href={`/meetings?project=${project.id}`}
                        className="muted block px-5 py-2.5 text-xs font-medium hover:underline"
                      >
                        {t("meeting.all").replace("{n}", String(meetings.total))}
                      </Link>
                    </li>
                  )}
                </ul>
              )}
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
