import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createTranslator, type MessageKey } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { canWrite, crmRole } from "@/lib/crm-access";
import { kelishuvById, kelishuvCode, missingKelishuv } from "@/lib/kelishuvlar";
import { meetingCode } from "@/lib/meeting-fields";
import { formatDate, formatNumber } from "@/lib/format";
import { INCOMPLETE_TONE, NEUTRAL_TONE, kelishuvTone } from "@/lib/types";
import { id as parseId } from "@/lib/validate";
import { Badge, Button, PageHeader, Panel } from "@/components/ui";
import { AgreementRowItem } from "../agreement-row";

export const dynamic = "force-dynamic";

/**
 * One agreement: what it says, and what it binds each side to.
 *
 * The content leads, with the page's one gold mark, as "what was agreed" does
 * on a meeting. Beneath it the obligations, every one of them, closed ones
 * included — the TZ's complaint about the old page was precisely that
 * fulfilled commitments vanished, when what was done under an agreement is
 * the record of it. Each keeps the actions it has on the deadline board, so
 * whoever owes an item can mark it done from here.
 */
export default async function KelishuvPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!canWrite(user)) redirect("/agreements");

  const locale = await currentLocale(user);
  const t = createTranslator(locale);

  const id = parseId((await params).id);
  const kelishuv = id ? await kelishuvById(id) : undefined;
  if (!kelishuv) notFound();

  const missing = missingKelishuv(kelishuv);
  const mayEdit =
    kelishuv.created_by === user.id ||
    kelishuv.responsible_id === user.id ||
    crmRole(user) === "admin";

  const notRecorded = <span className="muted text-xs">{t("meeting.missing")}</span>;

  const facts: [string, ReactNode][] = [
    [
      t("kelishuv.field.kind"),
      kelishuv.kind ? (
        <Badge className={NEUTRAL_TONE}>
          {t(`kelishuv.kind.${kelishuv.kind}` as MessageKey)}
        </Badge>
      ) : (
        notRecorded
      ),
    ],
    [
      t("kelishuv.field.parties"),
      kelishuv.parties.length ? (
        <ul className="space-y-1">
          {kelishuv.parties.map((party) => (
            <li key={party.id}>
              <Link href={`/companies/${party.id}`} className="font-medium hover:underline">
                {party.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        notRecorded
      ),
    ],
    [
      t("kelishuv.field.project"),
      kelishuv.loyiha_id ? (
        <Link href={`/projects/${kelishuv.loyiha_id}`} className="hover:underline">
          <span className="muted font-mono text-xs">{kelishuv.project_code}</span>{" "}
          {kelishuv.project_name}
        </Link>
      ) : (
        notRecorded
      ),
    ],
  ];
  if (kelishuv.meeting_id)
    facts.push([
      t("kelishuv.field.meeting"),
      <Link key="meeting" href={`/meetings/${kelishuv.meeting_id}`} className="hover:underline">
        <span className="muted font-mono text-xs">{meetingCode(kelishuv.meeting_id)}</span>{" "}
        {kelishuv.meeting_title}
      </Link>,
    ]);
  if (kelishuv.signed_on)
    facts.push([t("kelishuv.field.signed_on"), formatDate(kelishuv.signed_on)]);
  if (kelishuv.valid_until)
    facts.push([t("kelishuv.field.valid_until"), formatDate(kelishuv.valid_until)]);
  if (kelishuv.amount !== null)
    facts.push([
      t("kelishuv.field.amount"),
      <span key="amount" className="tabular-nums">
        {formatNumber(kelishuv.amount)} {kelishuv.currency}
      </span>,
    ]);
  facts.push([
    t("kelishuv.field.responsible"),
    kelishuv.responsible_name ?? notRecorded,
  ]);
  if (kelishuv.creator_name) facts.push([t("meeting.author"), kelishuv.creator_name]);

  const description = [
    kelishuvCode(kelishuv.id),
    kelishuv.parties.map((party) => party.name).join(", ") || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <p className="mb-3">
        <Link href="/agreements" className="muted text-xs font-medium hover:underline">
          {t("kelishuv.back")}
        </Link>
      </p>

      <PageHeader
        title={kelishuv.title}
        description={description}
        action={
          mayEdit ? (
            <Button href={`/agreements/${kelishuv.id}/edit`} variant="secondary">
              {t("meeting.edit")}
            </Button>
          ) : undefined
        }
      />

      <p className="mb-6 flex flex-wrap items-center gap-2 text-xs">
        <Badge className={kelishuvTone(kelishuv.view)}>
          {t(`kelishuv.status.${kelishuv.view}` as MessageKey)}
        </Badge>
        {missing.length > 0 && (
          <>
            <Badge className={INCOMPLETE_TONE}>{t("meeting.incomplete")}</Badge>
            <span className="muted">
              {t("meeting.missingList").replace(
                "{fields}",
                missing.map((field) => t(`kelishuv.field.${field}` as MessageKey)).join(", "),
              )}
            </span>
          </>
        )}
      </p>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="panel relative overflow-hidden p-4 lg:p-5">
            <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gold-500" />
            <h2 className="text-sm font-semibold">{t("kelishuv.field.content")}</h2>
            <div className="mt-2">
              {kelishuv.content?.trim() ? (
                <p className="whitespace-pre-line text-base leading-relaxed">
                  {kelishuv.content}
                </p>
              ) : (
                notRecorded
              )}
            </div>
          </section>

          <Panel title={`${t("kelishuv.field.obligations")} · ${kelishuv.obligations.length}`}>
            {kelishuv.obligations.length === 0 ? (
              <p className="p-4 lg:p-5">{notRecorded}</p>
            ) : (
              <ul className="divide-y">
                {kelishuv.obligations.map((obligation) => (
                  <AgreementRowItem
                    key={obligation.id}
                    agreement={obligation}
                    canSettle={canWrite(user) || obligation.owner_user_id === user.id}
                    showCompany={false}
                  />
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel title={t("meeting.facts")}>
          <dl className="divide-y">
            {facts.map(([label, value]) => (
              <div key={label} className="px-4 py-2.5 lg:px-5">
                <dt className="muted mb-1 text-xs">{label}</dt>
                <dd className="text-sm">{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
    </>
  );
}
