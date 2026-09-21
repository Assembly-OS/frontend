"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { Badge, Button, IconButton, Select } from "@/components/ui";
import type { MessageKey } from "@/lib/i18n";
import { NEUTRAL_TONE, type Role } from "@/lib/types";

/**
 * Who is attached to the project — which, since block 4, is who can see it
 * (TZ 4.2). The caption says so, because removing a name here takes the
 * project away from that person, and nothing else on the page would tell
 * whoever clicks it.
 *
 * The leader and deputy are attached by the passport and carry a chip instead
 * of a remove button; everyone else can be taken off by whoever may edit the
 * passport.
 *
 * Folded to the first few, leads first: the schema attached everyone who
 * ever worked on a project, a dozen names is common, and an unfolded list
 * pushed every panel below it off the screen.
 */

const FOLDED = 5;
export function ProjectMembers({
  projectId,
  members,
  candidates,
  canEdit,
}: {
  projectId: number;
  members: { user_id: number; full_name: string; role: Role; via: "owner" | "deputy" | "member" }[];
  candidates: { id: number; full_name: string; role: Role }[];
  canEdit: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const shown = open ? members : members.slice(0, FOLDED);

  const present = new Set(members.map((member) => member.user_id));
  const addable = candidates.filter((person) => !present.has(person.id));

  async function send(url: string, init: RequestInit) {
    setBusy(true);
    setError(false);
    try {
      const response = await fetch(url, init);
      if (!response.ok) {
        setError(true);
        return;
      }
      setPick("");
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <ul className="divide-y">
        {shown.map((member) => (
          <li key={member.user_id} className="flex min-h-12 items-center gap-3 px-5 py-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{member.full_name}</span>
              <span className="muted block truncate text-[11px]">
                {t(`role.${member.role}` as MessageKey)}
              </span>
            </span>
            {member.via !== "member" ? (
              <Badge className={NEUTRAL_TONE}>{t(`proj.members.${member.via}` as MessageKey)}</Badge>
            ) : (
              canEdit && (
                <IconButton
                  icon="close"
                  variant="ghost"
                  label={t("proj.members.remove").replace("{name}", member.full_name)}
                  disabled={busy}
                  onClick={() =>
                    void send(`/api/projects/${projectId}/members?userId=${member.user_id}`, {
                      method: "DELETE",
                    })
                  }
                />
              )
            )}
          </li>
        ))}
      </ul>

      {members.length > FOLDED && (
        <div className="border-t px-3 py-1.5">
          <Button size="sm" variant="ghost" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open
              ? t("proj.members.fold")
              : t("proj.members.all").replace("{n}", String(members.length))}
          </Button>
        </div>
      )}

      {canEdit && addable.length > 0 && (
        <div className="flex gap-2 border-t px-5 py-3">
          <Select
            value={pick}
            onChange={(event) => setPick(event.target.value)}
            aria-label={t("proj.members.add")}
            className="min-w-0 flex-1"
          >
            <option value="">{t("proj.members.pick")}</option>
            {addable.map((person) => (
              <option key={person.id} value={person.id}>
                {person.full_name} · {t(`role.${person.role}` as MessageKey)}
              </option>
            ))}
          </Select>
          <Button
            variant="secondary"
            disabled={busy || !pick}
            onClick={() =>
              void send(`/api/projects/${projectId}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: Number(pick) }),
              })
            }
          >
            {t("common.add")}
          </Button>
        </div>
      )}

      <p className="muted border-t px-5 py-3 text-[11px]">
        {error ? t("common.error") : t("proj.members.hint")}
      </p>
    </div>
  );
}
