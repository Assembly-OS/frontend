"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { Badge, Button } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { MessageKey } from "@/lib/i18n";
import { AGREEMENT_TONE } from "../companies/tone";

interface Row {
  id: number;
  description: string;
  company_id: number | null;
  company_name: string | null;
  owner_full_name: string | null;
  owner_name: string | null;
  deadline: string | null;
  status: string;
  source: string;
}

/** One commitment, with the two actions that move it along. */
export function AgreementRowItem({
  agreement,
  canSettle,
}: {
  agreement: Row;
  canSettle: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  // The view status is recomputed here rather than passed in, so a row cannot
  // show "in progress" while the server already considers it late.
  const today = new Date().toISOString().slice(0, 10);
  const view =
    agreement.status === "DONE" || agreement.status === "CANCELLED"
      ? agreement.status
      : agreement.deadline && agreement.deadline < today
        ? "OVERDUE"
        : agreement.status;

  async function move(status: string) {
    setBusy(true);
    try {
      await fetch(`/api/crm/agreements/${agreement.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm">{agreement.description}</p>
        <p className="muted mt-0.5 flex flex-wrap gap-x-2 text-xs">
          {agreement.company_id && agreement.company_name && (
            <Link href={`/companies/${agreement.company_id}`} className="hover:underline">
              {agreement.company_name}
            </Link>
          )}
          <span>{agreement.owner_full_name ?? agreement.owner_name ?? "—"}</span>
          {agreement.source === "ai" && <span>· AI</span>}
        </p>
      </div>

      <span className="muted shrink-0 text-xs tabular-nums">
        {agreement.deadline ? formatDate(agreement.deadline) : "—"}
      </span>
      <Badge className={AGREEMENT_TONE[view] ?? AGREEMENT_TONE.NEW}>
        {t(`crm.agr.${view}` as MessageKey)}
      </Badge>

      {canSettle && (
        <div className="flex shrink-0 gap-1.5">
          {agreement.status === "NEW" && (
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void move("IN_PROGRESS")}
            >
              {t("crm.markProgress")}
            </Button>
          )}
          <Button size="sm" disabled={busy} onClick={() => void move("DONE")}>
            {t("crm.markDone")}
          </Button>
        </div>
      )}
    </li>
  );
}
