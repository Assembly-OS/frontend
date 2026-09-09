"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "./i18n-provider";
import { Button } from "./ui";

/**
 * Reads a document that was attached before uploads were read automatically.
 *
 * Shown only next to a file the assistant cannot see. Once it succeeds the
 * marker beside the filename turns, and the file becomes answerable — which
 * is the only feedback needed, so there is no separate confirmation.
 */
export function ReadFileButton({ entryId }: { entryId: number }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function readIt() {
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch(`/api/entries/${entryId}/read`, {
        method: "POST",
      });
      const data = (await response.json()) as { read?: boolean };
      if (!response.ok || !data.read) {
        setFailed(true);
        return;
      }
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      icon="eye"
      disabled={busy}
      onClick={() => void readIt()}
      className="ml-1"
    >
      {busy
        ? t("common.loading")
        : failed
          ? t("thread.fileUnreadable")
          : t("thread.readFile")}
    </Button>
  );
}
