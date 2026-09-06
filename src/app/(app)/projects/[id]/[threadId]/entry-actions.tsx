"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { Button, FIELD, IconButton } from "@/components/ui";

/**
 * Pin, correct or remove one entry.
 *
 * Collapsed to a single glyph until asked for. A journal page carries dozens
 * of entries, and a visible row of three controls on each would turn a
 * history into a control panel — the reading comes first, and the editing is
 * something you go looking for.
 */
export function EntryActions({
  entryId,
  pinned,
  body,
  mayEdit,
}: {
  entryId: number;
  pinned: boolean;
  body: string;
  mayEdit: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(body);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send(init: RequestInit) {
    setBusy(true);
    try {
      const response = await fetch(`/api/entries/${entryId}`, init);
      if (response.ok) {
        setEditing(false);
        setConfirming(false);
        setOpen(false);
        router.refresh();
        return;
      }
    } catch {
      // Falls through to the same place a rejected response does: the entry
      // stays on screen unchanged, which is the honest outcome.
    }
    setBusy(false);
  }

  const patch = (payload: Record<string, unknown>) =>
    send({
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

  if (editing) {
    return (
      <span className="mt-2 block w-full">
        <textarea
          value={draft}
          rows={3}
          onChange={(event) => setDraft(event.target.value)}
          className={`${FIELD} resize-y`}
          aria-label={t("thread.editEntry")}
        />
        <span className="mt-2 flex gap-2">
          <Button
            size="sm"
            disabled={busy || !draft.trim()}
            onClick={() => void patch({ body: draft })}
          >
            {busy ? t("common.loading") : t("common.save")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            {t("action.cancel")}
          </Button>
        </span>
      </span>
    );
  }

  if (!open) {
    return (
      <IconButton
        icon="menu"
        variant="ghost"
        label={t("thread.entryActions")}
        onClick={() => setOpen(true)}
        className="size-7"
      />
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        icon="pin"
        disabled={busy}
        onClick={() => void patch({ action: pinned ? "unpin" : "pin" })}
      >
        {pinned ? t("thread.unpin") : t("thread.pin")}
      </Button>
      {mayEdit && (
        <>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            {t("thread.editEntry")}
          </Button>
          {confirming ? (
            <Button
              size="sm"
              variant="danger"
              disabled={busy}
              onClick={() => void send({ method: "DELETE" })}
            >
              {t("thread.deleteConfirm")}
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
              {t("common.delete")}
            </Button>
          )}
        </>
      )}
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
        {t("action.close")}
      </Button>
    </span>
  );
}
