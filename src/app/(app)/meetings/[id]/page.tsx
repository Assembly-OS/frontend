import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createTranslator, type MessageKey } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { canWrite, crmRole } from "@/lib/crm-access";
import { meetingById, meetingCode, missingFields } from "@/lib/meetings";
import { formatDate } from "@/lib/format";
import {
  INCOMPLETE_TONE,
  legalTone,
  statusTone,
  type TaskStatus,
} from "@/lib/types";
import { id as parseId } from "@/lib/validate";
import { Badge, Button, PageHeader, Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * One meeting, laid out around the question it exists to answer.
 *
 * "What was agreed" comes first and reads largest, with the page's one gold
 * mark beside it: the TZ calls it the field that gets asked years later, when
 * the people who were there have moved on. The facts — when, with whom, which
 * projects — sit to the side, because they are how the meeting is found, not
 * what it says.
 *
 * A required field left empty is not hidden. It is shown as "not recorded" in
 * its place and listed at the top, so an incomplete record says what it is
 * missing rather than looking complete.
 */
export default async function MeetingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ task?: string }>;
}) {
  const user = await requireUser();
  if (!canWrite(user)) redirect("/dashboard");

  const locale = await currentLocale(user);
  const t = createTranslator(locale);
  const lang = locale === "ru" ? "ru" : locale === "en" ? "en" : "uz";

  const meetingId = parseId((await params).id);
  const meeting = meetingId ? await meetingById(meetingId, lang) : undefined;
  if (!meeting) notFound();

  const taskFailed = (await searchParams).task === "failed";
  const missing = missingFields(meeting);
  const mayEdit =
    meeting.owner_id === user.id ||
    meeting.responsible_id === user.id ||
    crmRole(user) === "admin";

  // Quiet on purpose. The one amber signal is the "incomplete" badge above,
  // which names every missing field; eleven amber labels down the page would
  // make the colour mean nothing.
  const notRecorded = <span className="muted text-xs">{t("meeting.missing")}</span>;
  const prose = (text: string | null) =>
    text?.trim() ? (
      <p className="whitespace-pre-line text-sm leading-relaxed">{text}</p>
    ) : (
      notRecorded
    );

  const facts: [string, ReactNode][] = [
    [t("meeting.field.held_at"), meeting.held_at ? formatDate(meeting.held_at) : notRecorded],
    [
      t("meeting.field.company"),
      meeting.company_id ? (
        <Link href={`/companies/${meeting.company_id}`} className="font-medium hover:underline">
          {meeting.company_name}
        </Link>
      ) : (
        notRecorded
      ),
    ],
    [
      t("meeting.field.legal_status"),
      meeting.legal_status ? (
        <Badge className={legalTone(meeting.legal_status)}>
          {t(`meeting.legal.${meeting.legal_status}` as MessageKey)}
        </Badge>
      ) : (
        notRecorded
      ),
    ],
    [
      t("meeting.field.projects"),
      meeting.projects.length ? (
        <ul className="space-y-1">
          {meeting.projects.map((project) => (
            <li key={project.id}>
              <Link href={`/projects/${project.id}`} className="hover:underline">
                <span className="muted font-mono text-xs">{project.code}</span>{" "}
                {project.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        notRecorded
      ),
    ],
  ];
  if (meeting.uyushma_name) facts.push([t("meeting.field.uyushma"), meeting.uyushma_name]);
  if (meeting.place) facts.push([t("crm.place"), meeting.place]);
  facts.push([t("meeting.author"), meeting.owner_name]);

  const description = [
    meetingCode(meeting.id),
    meeting.held_at ? formatDate(meeting.held_at) : null,
    meeting.company_name,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <p className="mb-3">
        <Link href="/meetings" className="muted text-xs font-medium hover:underline">
          {t("meeting.back")}
        </Link>
      </p>

      <PageHeader
        title={meeting.title}
        description={description}
        action={
          mayEdit ? (
            <Button href={`/meetings/${meeting.id}/edit`} variant="secondary">
              {t("meeting.edit")}
            </Button>
          ) : undefined
        }
      />

      {taskFailed && (
        <p
          role="status"
          className="mb-4 rounded-xl bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-800 dark:text-amber-300"
        >
          {t("meeting.taskFailed")}
        </p>
      )}

      {missing.length > 0 && (
        <p className="mb-6 flex flex-wrap items-center gap-2 text-xs">
          <Badge className={INCOMPLETE_TONE}>{t("meeting.incomplete")}</Badge>
          <span className="muted">
            {t("meeting.missingList").replace(
              "{fields}",
              missing.map((field) => t(`meeting.field.${field}` as MessageKey)).join(", "),
            )}
          </span>
        </p>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* The answer the record exists for. The gold rule is the page's
              only accent and marks it as the thing to read first. */}
          <section className="panel relative overflow-hidden p-4 lg:p-5">
            <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gold-500" />
            <h2 className="text-sm font-semibold">{t("meeting.field.agreed")}</h2>
            <div className="mt-2">
              {meeting.agreed?.trim() ? (
                <p className="whitespace-pre-line text-base leading-relaxed">
                  {meeting.agreed}
                </p>
              ) : (
                notRecorded
              )}
            </div>
          </section>

          <Panel title={t("meeting.field.discussed")}>
            <div className="p-4 lg:p-5">{prose(meeting.description)}</div>
          </Panel>

          {meeting.open_issues?.trim() && (
            <Panel title={t("meeting.field.open_issues")}>
              <div className="p-4 lg:p-5">{prose(meeting.open_issues)}</div>
            </Panel>
          )}

          <Panel title={t("meeting.field.next_step")}>
            <div className="space-y-3 p-4 lg:p-5">
              {prose(meeting.next_steps)}
              <p className="flex flex-wrap items-center gap-2 text-xs">
                <span className="muted">{t("meeting.field.responsible")}:</span>
                {meeting.responsible_name ? (
                  <span className="font-medium">{meeting.responsible_name}</span>
                ) : (
                  notRecorded
                )}
                {meeting.next_task_code && meeting.next_task_status && (
                  <Link href="/tasks/assign" className="inline-flex items-center gap-1.5">
                    <span className="font-mono">{meeting.next_task_code}</span>
                    <Badge className={statusTone(meeting.next_task_status as TaskStatus)}>
                      {t(`status.${meeting.next_task_status}` as MessageKey)}
                    </Badge>
                  </Link>
                )}
              </p>
            </div>
          </Panel>

          {meeting.summary && (
            <Panel title={t("meeting.summary")}>
              <p className="p-4 text-sm leading-relaxed lg:p-5">{meeting.summary}</p>
            </Panel>
          )}

          {meeting.transcript.trim() && (
            <Panel title={t("crm.transcript")}>
              <details className="group p-4 lg:p-5">
                <summary className="muted cursor-pointer text-xs font-medium hover:underline">
                  {t("meeting.transcriptShow")}
                </summary>
                <pre className="scroll-thin mt-3 max-h-96 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed">
                  {meeting.transcript}
                </pre>
              </details>
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <Panel title={t("meeting.facts")}>
            {/* Label above value: this column is a third of the page, and a
                name or a Russian label beside a fixed-width term column broke
                over three lines. */}
            <dl className="divide-y">
              {facts.map(([label, value]) => (
                <div key={label} className="px-4 py-2.5 lg:px-5">
                  <dt className="muted mb-1 text-xs">{label}</dt>
                  <dd className="text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title={t("meeting.participants")}>
            <dl className="divide-y">
              <div className="px-4 py-2.5 lg:px-5">
                <dt className="muted mb-1 text-xs">{t("meeting.field.staff")}</dt>
                <dd className="text-sm">
                  {meeting.staff.length
                    ? meeting.staff.map((person) => person.full_name).join(", ")
                    : notRecorded}
                </dd>
              </div>
              <div className="px-4 py-2.5 lg:px-5">
                <dt className="muted mb-1 text-xs">{t("meeting.field.external")}</dt>
                <dd className="whitespace-pre-line text-sm">
                  {meeting.participants?.trim() ? meeting.participants : notRecorded}
                </dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}
