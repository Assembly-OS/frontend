"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import {
  Button,
  DateField,
  FIELD,
  PageHeader,
  Panel,
  Select,
} from "@/components/ui";
import type { MessageKey } from "@/lib/i18n";

const PRIORITIES = ["PAST", "ORTA", "YUQORI", "KRITIK"] as const;

/**
 * Recording a commitment from the board itself.
 *
 * It was previously only possible from inside a company's page, which meant
 * the screen headed "Agreements" was the one place you could not add one.
 * Most commitments are written down straight after a call, when the company
 * card is not what is on screen — so the company is a field here rather than
 * the route in.
 *
 * Deliberately closed by default: this page is opened far more often to check
 * a deadline than to add one, and a form sitting permanently above the list
 * pushes the overdue group below the fold.
 */
export function NewAgreement({
  companies,
  staff,
}: {
  companies: { id: number; name: string }[];
  staff: { id: number; full_name: string }[];
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(form: FormData) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/crm/agreements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: form.get("company_id") || null,
          description: form.get("description"),
          owner_user_id: form.get("owner_user_id") || null,
          deadline: form.get("deadline") || null,
          priority: form.get("priority"),
        }),
      });
      if (!response.ok) {
        setError(t("common.error"));
        return;
      }
      setOpen(false);
      // The new row belongs in one of the date groups above, which are
      // rendered on the server — so the list is re-read rather than patched.
      router.refresh();
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  // The page title comes with it, because the button belongs beside the title
  // and the form belongs at full width above the list — one piece of state,
  // two places on the page.
  const header = (
    <PageHeader
      title={t("crm.agreements")}
      description={t("crm.agreementsDesc")}
      action={
        open ? undefined : (
          <Button icon="plus" onClick={() => setOpen(true)}>
            {t("crm.newAgreement")}
          </Button>
        )
      }
    />
  );

  if (!open) return header;

  return (
    <>
      {header}
      <Panel className="mb-5">
      <form
        className="space-y-3 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit(new FormData(event.currentTarget));
        }}
      >
        <textarea
          name="description"
          required
          autoFocus
          rows={2}
          placeholder={t("crm.newAgreement")}
          // The placeholder was doing duty as the name, and a placeholder
          // stops existing the moment somebody types into the field.
          aria-label={t("crm.newAgreement")}
          className={`${FIELD} resize-y`}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          {/* The first <option> is placeholder text, not a label: a screen
              reader announces "combobox" with no name at all, and these two
              are the fields that say who the commitment is with and who
              carries it. */}
          <Select
            name="company_id"
            defaultValue=""
            required
            aria-label={t("crm.selectCompany")}
          >
            <option value="" disabled>
              {t("crm.selectCompany")}
            </option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>

          <Select
            name="owner_user_id"
            defaultValue=""
            aria-label={t("form.selectExecutor")}
          >
            <option value="">{t("form.selectExecutor")}</option>
            {staff.map((person) => (
              <option key={person.id} value={person.id}>
                {person.full_name}
              </option>
            ))}
          </Select>

          <DateField name="deadline" aria-label={t("form.deadline")} />

          <Select name="priority" defaultValue="ORTA" aria-label={t("form.priority")}>
            {PRIORITIES.map((level) => (
              <option key={level} value={level}>
                {t(`priority.${level}` as MessageKey)}
              </option>
            ))}
          </Select>
        </div>

        {companies.length === 0 && (
          <p className="muted text-xs">{t("crm.noCompanyYet")}</p>
        )}
        {error && (
          <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
        )}

        {/* The note sits above the buttons rather than beside them. It is a
            sentence about the two optional fields, not a third control, and
            on a phone it is long enough to crowd them off the row. */}
        <p className="muted text-xs">{t("crm.reminderNote")}</p>

        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={busy}>
            {t("common.save")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => {
              setOpen(false);
              setError("");
            }}
          >
            {t("action.cancel")}
          </Button>
        </div>
      </form>
      </Panel>
    </>
  );
}
