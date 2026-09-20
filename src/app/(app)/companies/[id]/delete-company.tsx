"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui";

/**
 * Deleting a company.
 *
 * It lives on the company's own page and nowhere else. A delete button on
 * every card in the directory grid would sit one slip away from taking a
 * partner's whole file — and from the grid you cannot see what goes with it.
 * Here the meetings, agreements and contacts are on screen above the button.
 *
 * Two presses, and the second one says what will happen rather than asking
 * whether you are sure. Restricted to the chairman and his assistant by the
 * endpoint; anyone else never sees it.
 *
 * A company with meetings or agreements cannot be deleted at all — it is
 * archived through its status instead, the way a staff account with history
 * is deactivated. So when the page already shows that history, the button is
 * replaced by the reason, rather than offered and then refused. The server
 * enforces the same rule and also counts what this page does not load
 * (project threads, meeting notes), which is why its refusal has a message
 * of its own too.
 */
export function DeleteCompany({
  companyId,
  hasHistory,
}: {
  companyId: number;
  hasHistory: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/crm/companies/${companyId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(
          data.error === "HAS_HISTORY"
            ? t("crm.deleteBlocked")
            : t("common.error"),
        );
        setBusy(false);
        setArmed(false);
        return;
      }
      // Back to the directory, and forced to re-read it: the card that was
      // just deleted must not still be sitting in the cached list.
      router.replace("/companies");
      router.refresh();
    } catch {
      setError(t("common.error"));
      setBusy(false);
      setArmed(false);
    }
  }

  if (hasHistory) {
    // Left-aligned, unlike the warnings below: the page header wraps by
    // content rather than at a breakpoint, so this sits beside the button on
    // a wide screen and under it on a phone, and only left alignment reads
    // right in both places.
    return <p className="muted max-w-xs text-xs">{t("crm.deleteBlocked")}</p>;
  }

  if (!armed) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button variant="ghost" size="sm" icon="trash" onClick={() => setArmed(true)}>
          {t("crm.deleteCompany")}
        </Button>
        {error && (
          <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <Button variant="danger" size="sm" disabled={busy} onClick={() => void remove()}>
          {t("crm.deleteCompanyConfirm")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => setArmed(false)}
        >
          {t("action.cancel")}
        </Button>
      </div>
      <p className="muted max-w-xs text-right text-xs">
        {t("crm.deleteCompanyWarn")}
      </p>
    </div>
  );
}
