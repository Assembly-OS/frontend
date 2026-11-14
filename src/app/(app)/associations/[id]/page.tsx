import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { homePath } from "@/lib/permissions";
import { createTranslator, type MessageKey } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { canRead } from "@/lib/crm-access";
import { mayRecordMeeting } from "@/lib/meeting-visibility";
import { isAssociationRole } from "@/lib/types";
import { associationCard, associationName, canManageAssociations } from "@/lib/associations";
import { Badge, Button, PageHeader, Panel } from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/format";
import { id as parseId } from "@/lib/validate";
import { ASSOCIATION_TONE, PATH_TONE } from "../../companies/tone";
import { AssociationMemory } from "../association-memory";

export const dynamic = "force-dynamic";

/**
 * One association, everything the Assembly knows about it (TZ 6.1): who
 * answers for it on each side, the projects it takes part in, its member
 * companies with where each stands, its meetings and assignments — and a
 * search over its own memory. Its chairman and representative see this
 * page and nothing beyond it.
 */
export default async function AssociationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canRead(user) && !isAssociationRole(user.role)) redirect(homePath(user.role));
  const locale = await currentLocale(user);
  const t = createTranslator(locale);

  const id = parseId((await params).id);
  const card = id ? await associationCard(user, id) : undefined;
  if (!card) notFound();
  const manage = canManageAssociations(user);
  const staff = canRead(user);

  const facts: [string, React.ReactNode][] = [
    [t("assoc.field.sector"), card.sector],
    [t("assoc.field.region"), card.region || null],
    [t("assoc.field.kontur"), card.kontur ? t(`dept.${card.kontur}` as MessageKey) : null],
    [t("assoc.field.responsible"), card.responsible_name],
    [t("assoc.field.head"), card.head_name],
    [t("assoc.field.headPosition"), card.head_position],
    [t("assoc.field.headContact"), card.head_contact],
    [
      t("assoc.field.headAccount"),
      card.head_login ? (
        <Link href={`/chat/${encodeURIComponent(card.head_login)}`} className="font-mono hover:underline">
          @{card.head_login}
        </Link>
      ) : null,
    ],
    [t("assoc.field.members"), card.members_count > 0 ? formatNumber(card.members_count) : null],
  ];
  const otherNames = [card.name_uzc, card.name_ru, card.name_en]
    .filter((name): name is string => Boolean(name) && name !== associationName(card, locale));

  return (
    <>
      <PageHeader
        title={associationName(card, locale)}
        description={otherNames.join(" · ") || undefined}
        action={
          <div className="flex flex-wrap items-start gap-2">
            {staff && (
              <Button href="/associations" variant="ghost">
                {t("assoc.back")}
              </Button>
            )}
            {mayRecordMeeting(user) && (
              <Button href={`/meetings/new?uyushma=${card.id}`} variant="secondary" icon="calendar">
                {t("crm.newMeeting")}
              </Button>
            )}
            {manage && (
              <Button href={`/associations/${card.id}/edit`} icon="plus">
                {t("assoc.edit")}
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge className={ASSOCIATION_TONE[card.status] ?? ASSOCIATION_TONE.FAOL}>
          {t(`assoc.status.${card.status}` as MessageKey)}
        </Badge>
        <span className="muted text-xs tabular-nums">
          {t("assoc.counts")
            .replace("{projects}", String(card.projects))
            .replace("{companies}", String(card.companies))
            .replace("{meetings}", String(card.meetings))}
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title={t("assoc.tab.projects")}>
            {card.projectList.length === 0 ? (
              <p className="muted px-5 py-6 text-center text-xs">{t("assoc.noProjects")}</p>
            ) : (
              <ul className="divide-y">
                {card.projectList.map((project) => (
                  <li key={project.id} className="flex items-baseline gap-3 px-5 py-2.5">
                    <Link href={`/projects/${project.id}`} className="min-w-0 flex-1 text-sm hover:underline">
                      <span className="muted mr-2 font-mono text-xs">{project.code}</span>
                      {project.name}
                    </Link>
                    {project.phase && (
                      <span className="muted shrink-0 text-[11px]">{t(`proj.phase.${project.phase}` as MessageKey)}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {staff && (
            <Panel
              title={t("assoc.tab.companies")}
              action={
                card.companies > 0 ? (
                  <Link href={`/companies?uyushma=${card.id}`} className="muted text-xs font-medium hover:underline">
                    {t("assoc.more").replace("{n}", String(card.companies))}
                  </Link>
                ) : undefined
              }
            >
              {card.companyList.length === 0 ? (
                <p className="muted px-5 py-6 text-center text-xs">{t("assoc.noCompanies")}</p>
              ) : (
                <ul className="divide-y">
                  {card.companyList.slice(0, 30).map((company) => (
                    <li key={company.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5">
                      <Link href={`/companies/${company.id}`} className="min-w-0 flex-1 text-sm font-medium hover:underline">
                        {company.name}
                      </Link>
                      {company.industry && <span className="muted text-xs">{company.industry}</span>}
                      <Badge className={PATH_TONE[company.stage] ?? PATH_TONE.NEW_CONTACT}>
                        {t(`crm.stage.${company.stage}` as MessageKey)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          <Panel title={t("assoc.tab.meetings")}>
            {card.meetingList.length === 0 ? (
              <p className="muted px-5 py-6 text-center text-xs">{t("assoc.noMeetings")}</p>
            ) : (
              <ul className="divide-y">
                {card.meetingList.map((meeting) => (
                  <li key={meeting.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <Link href={`/meetings/${meeting.id}`} className="text-sm font-semibold hover:underline">
                        {meeting.title}
                      </Link>
                      <span className="muted text-xs tabular-nums">{formatDate(meeting.held_at ?? meeting.created_at)}</span>
                    </div>
                    {meeting.agreed && <p className="mt-1 text-sm leading-relaxed">{meeting.agreed}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t("assoc.tab.tasks")}>
            {card.taskList.length === 0 ? (
              <p className="muted px-5 py-6 text-center text-xs">{t("assoc.noTasks")}</p>
            ) : (
              <ul className="divide-y">
                {card.taskList.map((task) => (
                  <li key={task.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-2.5">
                    {/* A task has no page of its own: it is opened from the
                        list it sits in. Here it is a fact about the
                        association, read in place. The title takes the
                        whole row on a phone; the meta wraps beneath it. */}
                    <p className="min-w-0 basis-full text-sm sm:flex-1 sm:basis-auto">
                      <span className="muted mr-2 font-mono text-xs">{task.code}</span>
                      {task.title}
                    </p>
                    <span className="muted text-xs">{task.to_name}</span>
                    {task.deadline && <span className="muted text-xs tabular-nums">{formatDate(task.deadline)}</span>}
                    <span className="muted text-[11px] font-medium uppercase">{t(`status.${task.status}` as MessageKey)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title={t("profile.personal")}>
            <dl className="divide-y">
              {facts
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label} className="flex gap-3 px-5 py-2.5">
                    <dt className="muted w-36 shrink-0 text-xs">{label}</dt>
                    <dd className="min-w-0 flex-1 text-sm [overflow-wrap:anywhere]">{value}</dd>
                  </div>
                ))}
            </dl>
          </Panel>

          <AssociationMemory uyushmaId={card.id} />
        </div>
      </div>
    </>
  );
}
