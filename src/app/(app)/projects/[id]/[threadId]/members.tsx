"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { Button, Select } from "@/components/ui";
import { Icon } from "@/components/icons";

/**
 * Who is working this thread.
 *
 * A line of names, not a panel. The project's owner answers for the whole of
 * it and is already in the header; this is the shorter list of people to tell
 * about this counterpart in particular, and on most threads it is empty or
 * two names long — a card with a heading would be more chrome than content.
 *
 * Adding and removing is restricted to the people who may open threads. The
 * membership decides who gets told about the work; letting anybody edit it
 * would let anybody quietly stop somebody else being told.
 */
export function ThreadMembers({
  threadId,
  members,
  staff,
  mayManage,
}: {
  threadId: number;
  members: { user_id: number; full_name: string }[];
  staff: { id: number; name: string }[];
  mayManage: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);

  const present = new Set(members.map((member) => member.user_id));
  const candidates = staff.filter((person) => !present.has(person.id));

  async function send(init: RequestInit, url: string) {
    setBusy(true);
    try {
      const response = await fetch(url, init);
      if (response.ok) {
        setAdding(false);
        setPick("");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  const add = () =>
    pick &&
    send(
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: Number(pick) }),
      },
      `/api/threads/${threadId}/members`,
    );

  const remove = (userId: number) =>
    send({ method: "DELETE" }, `/api/threads/${threadId}/members?userId=${userId}`);

  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
      <span className="muted flex items-center gap-1.5">
        <Icon name="users" className="size-3.5" />
        {t("thread.members")}
      </span>

      {members.length === 0 && <span className="muted">{t("thread.noMembers")}</span>}

      {members.map((member) => (
        <span key={member.user_id} className="flex items-center gap-1">
          <span>{member.full_name}</span>
          {mayManage && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove(member.user_id)}
              aria-label={`${t("common.delete")}: ${member.full_name}`}
              className="muted rounded hover:text-[var(--ink)] disabled:opacity-45"
            >
              <Icon name="close" className="size-3" />
            </button>
          )}
        </span>
      ))}

      {mayManage && candidates.length > 0 && !adding && (
        <Button size="sm" variant="ghost" icon="plus" onClick={() => setAdding(true)}>
          {t("thread.addMember")}
        </Button>
      )}

      {adding && (
        <span className="flex items-center gap-2">
          <Select
            value={pick}
            onChange={(event) => setPick(event.target.value)}
            aria-label={t("thread.addMember")}
            className="w-auto"
          >
            <option value="">{t("thread.ownerNone")}</option>
            {candidates.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </Select>
          <Button size="sm" disabled={busy || !pick} onClick={() => void add()}>
            {t("common.add")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
            {t("action.cancel")}
          </Button>
        </span>
      )}
    </div>
  );
}
