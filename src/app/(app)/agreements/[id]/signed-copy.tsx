"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import { formatBytes } from "@/lib/format";

type Busy = "upload" | "remove" | null;

/**
 * The signed copy of an agreement, TZ block 1.2.
 *
 * One current file. Replacing or removing it keeps the earlier one in the
 * archive — the copy that was signed is exactly what must not vanish — and the
 * panel says so, so nobody hesitates to correct a wrong upload.
 */
export function SignedCopy({
  id,
  file,
  canEdit,
}: {
  id: number;
  file: { name: string; size: number | null } | null;
  canEdit: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<Busy>(null);
  // Two presses, not a modal: the second one says what it will do.
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(kind: Exclude<Busy, null>, request: Promise<Response>) {
    setBusy(kind);
    setError(null);
    try {
      const response = await request;
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(t(data.error === "TOO_LARGE" ? "kelishuv.file.tooLarge" : "common.error"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(null);
      setConfirmRemove(false);
      if (input.current) input.current.value = "";
    }
  }

  function upload(chosen: File) {
    const form = new FormData();
    form.append("file", chosen);
    void send("upload", fetch(`/api/crm/kelishuvlar/${id}/file`, { method: "POST", body: form }));
  }

  return (
    <div className="space-y-3 p-4 lg:p-5">
      {file ? (
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="muted grid size-9 shrink-0 place-items-center rounded-lg border"
          >
            <Icon name="file" className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" title={file.name}>
              {file.name}
            </p>
            <p className="muted text-[11px] tabular-nums">{formatBytes(file.size)}</p>
          </div>
        </div>
      ) : (
        <p className="muted text-sm">{t("kelishuv.file.none")}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {file && (
          <Button
            variant="secondary"
            size="sm"
            icon="download"
            href={`/api/crm/kelishuvlar/${id}/file`}
          >
            {t("kelishuv.file.download")}
          </Button>
        )}
        {canEdit && (
          <>
            <Button
              variant="secondary"
              size="sm"
              icon="paperclip"
              disabled={busy !== null}
              onClick={() => input.current?.click()}
            >
              {busy === "upload"
                ? t("kelishuv.file.busy")
                : t(file ? "kelishuv.file.replace" : "kelishuv.file.upload")}
            </Button>
            <input
              ref={input}
              type="file"
              tabIndex={-1}
              aria-hidden
              className="sr-only"
              onChange={(event) => {
                const chosen = event.target.files?.[0];
                if (chosen) upload(chosen);
              }}
            />
            {file &&
              (confirmRemove ? (
                <>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={busy !== null}
                    onClick={() =>
                      void send(
                        "remove",
                        fetch(`/api/crm/kelishuvlar/${id}/file`, { method: "DELETE" }),
                      )
                    }
                  >
                    {t("kelishuv.file.removeConfirm")}
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
                  {t("kelishuv.file.remove")}
                </Button>
              ))}
          </>
        )}
      </div>

      {canEdit && file && (
        <p className="muted text-[11px] leading-relaxed">{t("kelishuv.file.kept")}</p>
      )}
      {error && (
        <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
