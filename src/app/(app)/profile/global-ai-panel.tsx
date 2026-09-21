"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { Badge, Button, EmptyState, Panel } from "@/components/ui";
import type { MessageKey } from "@/lib/i18n";
import { NEUTRAL_TONE, type Role } from "@/lib/types";

/**
 * The one permission the chairman sets per person (TZ 4.2): the global AI
 * view, which answers across the isolation instead of from the person's own
 * scope. Granted to a department head and taken back without touching his
 * role. Every question asked under it goes into the audit journal, which the
 * caption says, because that is part of what is being granted.
 */
export function GlobalAiPanel({
  heads,
}: {
  heads: { id: number; full_name: string; role: Role; global_ai: number }[];
}) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  async function toggle(id: number, on: boolean) {
    setBusy(id);
    setFailed(false);
    try {
      const response = await fetch(`/api/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "globalAi", on }),
      });
      if (!response.ok) setFailed(true);
      else router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Panel title={t("globalAi.title")}>
      {heads.length === 0 ? (
        <EmptyState bare icon="shield" text={t("globalAi.none")} />
      ) : (
        <ul className="divide-y">
          {heads.map((head) => {
            const on = head.global_ai === 1;
            return (
              <li key={head.id} className="flex min-h-14 items-center gap-3 px-5 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{head.full_name}</span>
                  <span className="muted block truncate text-[11px]">
                    {t(`role.${head.role}` as MessageKey)}
                  </span>
                </span>
                {on && <Badge className={NEUTRAL_TONE}>{t("globalAi.on")}</Badge>}
                <Button
                  size="sm"
                  variant={on ? "ghost" : "secondary"}
                  disabled={busy !== null}
                  aria-pressed={on}
                  onClick={() => void toggle(head.id, !on)}
                >
                  {on ? t("globalAi.revoke") : t("globalAi.grant")}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="muted border-t px-5 py-3 text-[11px]">
        {failed ? t("common.error") : t("globalAi.caption")}
      </p>
    </Panel>
  );
}
