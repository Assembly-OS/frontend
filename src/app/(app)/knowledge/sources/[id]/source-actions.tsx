"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui";

/** Open the record the passages came from; read it again if it failed. */
export function SourceActions({
  id,
  href,
  retryable,
}: {
  id: number;
  href: string;
  retryable: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");

  async function retry() {
    setState("busy");
    try {
      const response = await fetch(`/api/knowledge/sources/${id}/retry`, { method: "POST" });
      setState(response.ok ? "done" : "idle");
      if (response.ok) router.refresh();
    } catch {
      setState("idle");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" size="sm" icon="link" href={href}>
        {t("knowledge.source.original")}
      </Button>
      {retryable && (
        <Button variant="ghost" size="sm" disabled={state !== "idle"} onClick={() => void retry()}>
          {state === "done" ? t("knowledge.source.retried") : t("knowledge.source.retry")}
        </Button>
      )}
    </div>
  );
}
