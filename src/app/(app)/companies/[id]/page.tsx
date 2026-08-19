import { notFound } from "next/navigation";
import { createTranslator, type MessageKey } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { canDelete, canWrite } from "@/lib/crm-access";
import {
  agreementsOf,
  companyById,
  contactsOf,
  meetingsOf,
  viewStatus,
} from "@/lib/crm";
import { assignableUsers } from "@/lib/queries";
import { Badge, Button, PageHeader, Panel } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { AGREEMENT_TONE, COMPANY_TONE } from "../tone";
import { partnersFor } from "@/lib/agents/partners";
import { CompanyPanels } from "./company-panels";
import { DeleteCompany } from "./delete-company";
import { id as parseId } from "@/lib/validate";

export const dynamic = "force-dynamic";

/**
 * One company, everything about it, in one place.
 *
 * The whole point of the CRM: the profile at the top, and beneath it the
 * complete history — every meeting, every commitment, every person — so the
 * question "what is going on with this company" has one answer in one page
 * rather than three searches and a phone call.
 */
export default async function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const locale = await currentLocale(user);
  const t = createTranslator(locale);

  const companyId = parseId((await params).id);
  const company = companyId ? await companyById(companyId) : undefined;
  if (!company) notFound();

  const lang = locale === "ru" ? "ru" : locale === "en" ? "en" : "uz";
  const meetings = await meetingsOf(company.id, lang);
  const agreements = await agreementsOf(company.id);
  const contacts = await contactsOf(company.id);
  // What the meeting analyses concluded about this company: the history it
  // wrote and what it thinks is worth proposing next. Same row, same page —
  // the separate "AI suggestions" screen exists only for browsing all of them.
  const insight = (await partnersFor(lang)).find(
    (entry) => entry.id === company.id,
  );
  const writable = canWrite(user);
  const removable = canDelete(user);

  const facts: [string, string | null][] = [
    [t("crm.field.industry"), company.industry],
    [t("crm.field.direction"), company.direction],
    [t("crm.field.head"), company.head_name],
    [t("crm.field.headPosition"), company.head_position],
    [t("crm.field.phone"), company.phone],
    [t("crm.field.email"), company.email],
    [t("crm.field.website"), company.website],
    [
      t("crm.field.address"),
      [company.country, company.city, company.address].filter(Boolean).join(", ") || null,
    ],
    [t("crm.field.owner"), company.owner_name],
    [t("crm.field.started"), company.started_at && formatDate(company.started_at)],
    [
      t("crm.field.lastContact"),
      formatDate(company.last_contact_at ?? company.last_seen),
    ],
    [t("crm.field.nextContact"), company.next_contact_at && formatDate(company.next_contact_at)],
  ];

  return (
    <>
      <PageHeader
        title={company.name}
        description={company.description ?? undefined}
        action={
          writable ? (
            <div className="flex flex-wrap items-start gap-2">
              <Button href={`/meetings/new?company=${company.id}`} icon="calendar">
                {t("crm.newMeeting")}
              </Button>
              {removable && <DeleteCompany companyId={company.id} />}
            </div>
          ) : undefined
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge className={COMPANY_TONE[company.status] ?? COMPANY_TONE.POTENTIAL}>
          {t(`crm.status.${company.status}` as MessageKey)}
        </Badge>
        {company.services && (
          <span className="muted text-xs">{company.services}</span>
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title={t("crm.tab.meetings")}>
            {meetings.length === 0 ? (
              <p className="muted px-5 py-8 text-center text-sm">
                {t("meetings.empty")}
              </p>
            ) : (
              <ul className="divide-y">
                {meetings.map((meeting) => (
                  <li key={meeting.id} className="px-5 py-3.5">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <p className="text-sm font-semibold">{meeting.title}</p>
                      <span className="muted text-xs tabular-nums">
                        {formatDate(meeting.held_at ?? meeting.created_at)}
                      </span>
                    </div>
                    {meeting.participants && (
                      <p className="muted mt-0.5 text-xs">
                        {t("crm.participants")}: {meeting.participants}
                      </p>
                    )}
                    {meeting.summary && (
                      <p className="mt-1.5 text-sm leading-relaxed">
                        {meeting.summary}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t("crm.tab.agreements")}>
            {agreements.length === 0 ? (
              <p className="muted px-5 py-8 text-center text-sm">
                {t("crm.noAgreements")}
              </p>
            ) : (
              <ul className="divide-y">
                {agreements.map((agreement) => {
                  const view = viewStatus(agreement.status, agreement.deadline);
                  return (
                    <li
                      key={agreement.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3"
                    >
                      <p className="min-w-0 flex-1 text-sm">{agreement.description}</p>
                      <span className="muted text-xs">
                        {agreement.owner_full_name ?? agreement.owner_name ?? "—"}
                      </span>
                      <span className="muted text-xs tabular-nums">
                        {agreement.deadline ? formatDate(agreement.deadline) : "—"}
                      </span>
                      <Badge className={AGREEMENT_TONE[view]}>
                        {t(`crm.agr.${view}` as MessageKey)}
                      </Badge>
                    </li>
                  );
                })}
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
                    <dd className="min-w-0 flex-1 text-sm">{value}</dd>
                  </div>
                ))}
            </dl>
          </Panel>

          <CompanyPanels
            companyId={company.id}
            contacts={contacts}
            staff={(await assignableUsers(user)).map((person) => ({
              id: person.id,
              full_name: person.full_name,
            }))}
            writable={writable}
          />

          {insight && insight.ideas.length > 0 && (
            <Panel title={t("partners.propose")}>
              <ul className="divide-y">
                {insight.ideas.map((idea) => (
                  <li key={idea.id} className="px-5 py-3">
                    <p className="text-sm font-medium">{idea.proposal}</p>
                    {idea.why && (
                      <p className="muted mt-0.5 text-xs">{idea.why}</p>
                    )}
                    {idea.match && (
                      <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        ↔ {idea.match}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {insight && insight.notes.length > 0 && (
            <Panel title={t("partners.history")}>
              <ul className="divide-y">
                {insight.notes.map((note, index) => (
                  <li
                    key={`${note.created_at}-${index}`}
                    className="flex gap-2 px-5 py-2.5 text-sm"
                  >
                    <span className="muted shrink-0 text-[11px] uppercase">
                      {t(`partners.kind.${note.kind}` as MessageKey)}
                    </span>
                    <span className="min-w-0 flex-1">{note.text}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {company.notes && (
            <Panel title={t("crm.field.notes")}>
              <p className="whitespace-pre-wrap p-5 text-sm">{company.notes}</p>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
