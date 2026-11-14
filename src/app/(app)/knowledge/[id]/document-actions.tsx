"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui";
import type { SourceStatus } from "@/lib/knowledge/types";
import { ACCEPT, uploadErrorKey } from "../library";

type Busy = "replace" | "retry" | "remove" | null;

/**
 * What can be done with one document. Downloading the original is for
 * everyone who may read it — it is how a cited answer gets checked.
 * Replacing, reading again and removing are for whoever uploaded it and
 * the people who manage the AI's material.
 */
export function DocumentActions({
  id,
  status,
  canManage,
}: {
  id: number;
  status: SourceStatus;
  canManage: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<Busy>(null);
  // Two presses, not a modal: the second press says what it will do.
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(kind: Exclude<Busy, null>, request: Promise<Response>) {
    setBusy(kind);
    setError(null);
    try {
      const response = await request;
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(t(uploadErrorKey(data.error)));
        return false;
      }
      return true;
    } catch {
      setError(t("common.error"));
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function replace(file: File) {
    const form = new FormData();
    form.append("file", file);
    const ok = await send("replace", fetch(`/api/knowledge/${id}`, { method: "PUT", body: form }));
    if (input.current) input.current.value = "";
    if (ok) router.refresh();
  }

  async function retry() {
    const ok = await send("retry", fetch(`/api/knowledge/${id}/retry`, { method: "POST" }));
    if (ok) router.refresh();
  }

  async function remove() {
    const ok = await send("remove", fetch(`/api/knowledge/${id}`, { method: "DELETE" }));
    if (ok) {
      router.push("/knowledge");
      router.refresh();
    } else {
      setConfirmRemove(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" icon="download" href={`/api/knowledge/${id}/file`}>
          {t("knowledge.doc.download")}
        </Button>

        {canManage && (
          <>
            {(status === "FAILED" || status === "PARTIAL") && (
              <Button
                variant="secondary"
                size="sm"
                disabled={busy !== null}
                onClick={() => void retry()}
              >
                {t("knowledge.doc.retry")}
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              icon="file"
              disabled={busy !== null}
              onClick={() => input.current?.click()}
            >
              {busy === "replace" ? t("knowledge.doc.replacing") : t("knowledge.doc.replace")}
            </Button>
            <input
              ref={input}
              type="file"
              accept={ACCEPT}
              tabIndex={-1}
              aria-hidden
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void replace(file);
              }}
            />

            {confirmRemove ? (
              <>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => void remove()}
                >
                  {t("knowledge.doc.removeConfirm")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => setConfirmRemove(false)}
                >
                  {t("action.cancel")}
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                icon="trash"
                disabled={busy !== null}
                onClick={() => setConfirmRemove(true)}
              >
                {t("knowledge.doc.remove")}
              </Button>
            )}
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
