"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui";

/**
 * Deleting a chat, with its whole journal.
 *
 * It lives on the chat's own page and nowhere else — never on the rail. From
 * a list of eleven counterparts you cannot see what goes with the one you are
 * about to remove; here the entries, the members and the pinned records are
 * all on screen above the button.
 *
 * Two presses, and the second one says what will happen rather than asking
 * whether you are sure. Offered to the people who may open a chat, because
 * the case this exists for is theirs: entries written up under the wrong
 * project, noticed afterwards. The endpoint checks the same thing; anyone
 * else never sees the control.
 */
export function DeleteThread({
  threadId,
  projectId,
}: {
  threadId: number;
  projectId: number;
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
      const response = await fetch(`/api/threads/${threadId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setError(t("common.error"));
        setBusy(false);
        setArmed(false);
        return;
      }
      // Back to the project, and forced to re-read it: the rail must not
      // still be offering the chat that was just deleted.
      router.replace(`/projects/${projectId}`);
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
        <Button
          variant="ghost"
          size="sm"
          icon="trash"
          onClick={() => setArmed(true)}
        >
          {t("thread.deleteThread")}
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
        <Button
          variant="danger"
          size="sm"
          disabled={busy}
          onClick={() => void remove()}
        >
          {t("thread.deleteThreadConfirm")}
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
        {t("thread.deleteThreadWarn")}
      </p>
    </div>
  );
}
