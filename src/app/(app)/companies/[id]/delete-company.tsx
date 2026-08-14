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
 */
export function DeleteCompany({ companyId }: { companyId: number }) {
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
        setError(t("common.error"));
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
