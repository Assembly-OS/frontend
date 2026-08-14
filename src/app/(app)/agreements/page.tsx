import { createTranslator, type MessageKey } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { canWrite } from "@/lib/crm-access";
import { agreementBoard, companies, type AgreementRow } from "@/lib/crm";
import { assignableUsers } from "@/lib/queries";
import { EmptyState, PageHeader, Panel } from "@/components/ui";
import { AgreementRowItem } from "./agreement-row";
import { NewAgreement } from "./new-agreement";

export const dynamic = "force-dynamic";

/**
 * Today, soon, overdue — the three questions somebody opens this page to ask.
 *
 * Managers see the whole Assembly's commitments; everyone else sees their own,
 * because an employee scrolling past forty other people's deadlines to find
 * two of theirs will stop opening the page.
 */
export default async function AgreementsPage() {
  const user = await requireUser();
  const locale = await currentLocale(user);
  const t = createTranslator(locale);
  const writable = canWrite(user);
  const board = agreementBoard(writable ? undefined : user.id);

  const groups: [MessageKey, AgreementRow[], boolean][] = [
    ["crm.overdue", board.overdue, true],
    ["crm.today", board.todayList, false],
    ["crm.soon", board.soon, false],
    ["crm.later", board.later, false],
    ["crm.noDeadline", board.noDeadline, false],
  ];
  const total = groups.reduce((sum, [, rows]) => sum + rows.length, 0);

  return (
    <>
      {writable ? (
        // The composer owns the header: the button sits beside the title and
        // the form opens full width beneath it, off one piece of state.
        <NewAgreement
          companies={companies().map((company) => ({
            id: company.id,
            name: company.name,
          }))}
          staff={assignableUsers(user).map((person) => ({
            id: person.id,
            full_name: person.full_name,
          }))}
        />
      ) : (
        <PageHeader
          title={t("crm.agreements")}
          description={t("crm.agreementsDesc")}
        />
      )}

      {total === 0 ? (
        <EmptyState text={t("crm.noAgreements")} icon="check" />
      ) : (
        <div className="space-y-5">
          {groups
            .filter(([, rows]) => rows.length > 0)
            .map(([key, rows, urgent]) => (
              <Panel
                key={key}
                title={`${t(key)} · ${rows.length}`}
                className={urgent ? "ring-1 ring-rose-500/20" : ""}
              >
                <ul className="divide-y">
                  {rows.map((agreement) => (
                    <AgreementRowItem
                      key={agreement.id}
                      agreement={agreement}
                      canSettle={
                        writable || agreement.owner_user_id === user.id
                      }
                    />
                  ))}
                </ul>
              </Panel>
            ))}
        </div>
      )}
    </>
  );
}
