import Link from "next/link";
import type { Translator, MessageKey } from "@/lib/i18n";
import type { User } from "@/lib/types";
import { canWrite } from "@/lib/crm-access";
import { agreementBoard, crmTotals } from "@/lib/crm";
import { Badge, MetricStrip, Panel } from "@/components/ui";
import { Icon } from "@/components/icons";
import { formatDate } from "@/lib/format";
import { AGREEMENT_TONE } from "../companies/tone";

/**
 * The CRM's answer to "what should I look at first".
 *
 * Counts on the left, and beside them the one list that earns its place on a
 * dashboard: what is already late, then what is due today. Everything else is
 * a click away and does not belong on the front page.
 */
export async function CrmBlock({ user, t }: { user: User; t: Translator }) {
  const totals = await crmTotals();
  // A manager is accountable for the Assembly's commitments; everyone else is
  // shown their own, which is the only list they can act on.
  const board = await agreementBoard(canWrite(user) ? undefined : user.id);
  const attention = [...board.overdue, ...board.todayList].slice(0, 6);

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <Icon name="users" className="size-4" aria-hidden />
        <h2 className="text-sm font-semibold tracking-tight">
          {t("crm.companies")}
        </h2>
      </div>

      <MetricStrip
        items={[
          { label: t("crm.companies"), value: totals.companies, href: "/companies" },
          {
            label: t("crm.status.ACTIVE"),
            value: totals.active,
            href: "/companies?status=ACTIVE",
          },
          {
            label: t("crm.tab.meetings"),
            value: totals.meetingsThisMonth,
            hint: t("reports.thisMonth"),
          },
          {
            label: t("crm.tab.agreements"),
            value: totals.openAgreements,
            hint: `${t("crm.overdue")}: ${totals.overdue}`,
            href: "/agreements",
          },
        ]}
      />

      {attention.length > 0 && (
        <Panel
          title={`${t("crm.needsAttention")} · ${attention.length}`}
          className="mt-4 ring-1 ring-rose-500/20"
          action={
            <Link
              href="/agreements"
              className="muted inline-flex items-center gap-1 text-xs font-medium hover:underline"
            >
              {t("crm.agreements")}
              <Icon name="arrow" className="size-3.5" />
            </Link>
          }
        >
          <ul className="divide-y">
            {attention.map((agreement) => {
              const late =
                agreement.deadline &&
                agreement.deadline < new Date().toISOString().slice(0, 10);
              return (
                <li
                  key={agreement.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3"
                >
                  <p className="min-w-0 flex-1 text-sm">{agreement.description}</p>
                  {agreement.company_id && agreement.company_name && (
                    <Link
                      href={`/companies/${agreement.company_id}`}
                      className="muted shrink-0 text-xs hover:underline"
                    >
                      {agreement.company_name}
                    </Link>
                  )}
                  <span className="muted shrink-0 text-xs tabular-nums">
                    {agreement.deadline ? formatDate(agreement.deadline) : "—"}
                  </span>
                  <Badge
                    className={late ? AGREEMENT_TONE.OVERDUE : AGREEMENT_TONE.IN_PROGRESS}
                  >
                    {t(
                      (late ? "crm.agr.OVERDUE" : "crm.today") as MessageKey,
                    )}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </section>
  );
}
