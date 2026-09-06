"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { Button, DateField, FIELD, Panel, Select } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { MessageKey } from "@/lib/i18n";

type Extra = "none" | "date" | "link" | "agreement" | "task";

/**
 * Writing one record into the thread.
 *
 * It opens as a box and a button, and it stays that way for the entry people
 * actually write ninety times out of a hundred: a sentence about what
 * happened. Everything else — the day it happened, an attachment, a link, a
 * commitment, an assignment — is one control away and none of it is on screen
 * until it is wanted. A composer that asks six questions gets used once.
 *
 * The two "raise" paths do not write a task or an agreement themselves. They
 * call the endpoints that already do it — with their notifications, chains
 * and reminders — and then file the entry pointing at the result. A second
 * implementation of assigning work would have drifted from the first within
 * a month, and the drift would have been silent.
 */
export function Composer({
  threadId,
  projectId,
  staff,
}: {
  threadId: number;
  projectId: number;
  staff: { id: number; name: string }[];
}) {
  const t = useT();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [body, setBody] = useState("");
  const [kind, setKind] = useState("NOTE");
  const [extra, setExtra] = useState<Extra>("none");
  const [occurredOn, setOccurredOn] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [deadline, setDeadline] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setBody("");
    setKind("NOTE");
    setExtra("none");
    setOccurredOn("");
    setLinkUrl("");
    setDeadline("");
    setOwnerId("");
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function post(payload: Record<string, unknown>) {
    const response = await fetch(`/api/threads/${threadId}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.ok;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (!text && !file && !linkUrl.trim()) return;

    setBusy(true);
    setError("");

    try {
      // A file is its own request: it carries bytes, and the record it
      // produces is the same record either way.
      if (file) {
        const form = new FormData();
        form.append("file", file);
        form.append("body", text);
        if (occurredOn) form.append("occurredOn", occurredOn);
        const response = await fetch(`/api/threads/${threadId}/entries`, {
          method: "POST",
          body: form,
        });
        if (!response.ok) throw new Error("upload");
        reset();
        router.refresh();
        return;
      }

      if (extra === "task") {
        const assignee = Number(ownerId);
        if (!assignee || !text) {
          setError(t("thread.taskNeedsOwner"));
          setBusy(false);
          return;
        }
        // The first line becomes the title and the rest the description,
        // because that is how people write "do X — here is why" in one box.
        const [title, ...rest] = text.split("\n");
        const created = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.slice(0, 200),
            description: rest.join("\n").trim() || null,
            toUserId: assignee,
            deadline: deadline || null,
            loyihaId: projectId,
          }),
        });
        const data = (await created.json()) as { id?: number };
        if (!created.ok || !data.id) throw new Error("task");
        if (
          !(await post({ kind: "NOTE", body: text, occurredOn, taskId: data.id }))
        )
          throw new Error("entry");
        reset();
        router.refresh();
        return;
      }

      if (extra === "agreement") {
        if (!text) {
          setError(t("thread.agreementNeedsText"));
          setBusy(false);
          return;
        }
        const created = await fetch("/api/crm/agreements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: text.slice(0, 1000),
            deadline: deadline || null,
            owner_user_id: ownerId ? Number(ownerId) : null,
            loyiha_id: projectId,
            thread_id: threadId,
          }),
        });
        const data = (await created.json()) as { id?: number };
        if (!created.ok || !data.id) throw new Error("agreement");
        if (
          !(await post({
            kind: "AGREEMENT",
            body: text,
            occurredOn,
            agreementId: data.id,
          }))
        )
          throw new Error("entry");
        reset();
        router.refresh();
        return;
      }

      const ok = await post({
        kind: linkUrl.trim() ? "LINK" : kind,
        body: text,
        occurredOn,
        linkUrl: linkUrl.trim() || null,
      });
      if (!ok) throw new Error("entry");
      reset();
      router.refresh();
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  const toggle = (value: Extra) =>
    setExtra((current) => (current === value ? "none" : value));

  return (
    <Panel>
      <form onSubmit={submit} className="p-4 sm:p-5">
        <label htmlFor="entry-body" className="sr-only">
          {t("thread.write")}
        </label>
        <textarea
          id="entry-body"
          rows={3}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t("thread.writePlaceholder")}
          className={`${FIELD} resize-y`}
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Select
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            aria-label={t("thread.field.entryKind")}
            className="w-auto"
          >
            {["NOTE", "MEETING"].map((value) => (
              <option key={value} value={value}>
                {t(`thread.entry.${value}` as MessageKey)}
              </option>
            ))}
          </Select>

          <Button
            size="sm"
            variant={extra === "date" ? "secondary" : "ghost"}
            icon="calendar"
            onClick={() => toggle("date")}
          >
            {t("thread.when")}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            icon="paperclip"
            onClick={() => fileInput.current?.click()}
          >
            {file ? file.name.slice(0, 24) : t("thread.attach")}
          </Button>
          <input
            ref={fileInput}
            type="file"
            className="hidden"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />

          <Button
            size="sm"
            variant={extra === "link" ? "secondary" : "ghost"}
            icon="link"
            onClick={() => toggle("link")}
          >
            {t("thread.link")}
          </Button>

          <Button
            size="sm"
            variant={extra === "agreement" ? "secondary" : "ghost"}
            icon="check"
            onClick={() => toggle("agreement")}
          >
            {t("thread.asAgreement")}
          </Button>

          <Button
            size="sm"
            variant={extra === "task" ? "secondary" : "ghost"}
            icon="send"
            onClick={() => toggle("task")}
          >
            {t("thread.asTask")}
          </Button>
        </div>

        {extra === "date" && (
          <div className="mt-3 max-w-xs">
            <label
              htmlFor="entry-day"
              className="mb-1.5 block text-xs font-medium"
            >
              {t("thread.whenHint")}
            </label>
            <DateField
              id="entry-day"
              value={occurredOn}
              onChange={(event) => setOccurredOn(event.target.value)}
            />
          </div>
        )}

        {extra === "link" && (
          <div className="mt-3">
            <label
              htmlFor="entry-link"
              className="mb-1.5 block text-xs font-medium"
            >
              {t("thread.link")}
            </label>
            <input
              id="entry-link"
              type="url"
              inputMode="url"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https://"
              className={FIELD}
            />
          </div>
        )}

        {(extra === "agreement" || extra === "task") && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="entry-owner"
                className="mb-1.5 block text-xs font-medium"
              >
                {extra === "task" ? t("thread.assignee") : t("thread.owner")}
              </label>
              <Select
                id="entry-owner"
                value={ownerId}
                onChange={(event) => setOwnerId(event.target.value)}
              >
                <option value="">{t("thread.ownerNone")}</option>
                {staff.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label
                htmlFor="entry-deadline"
                className="mb-1.5 block text-xs font-medium"
              >
                {t("thread.deadline")}
              </label>
              <DateField
                id="entry-deadline"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
              />
            </div>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mt-3 text-sm font-medium text-rose-700 dark:text-rose-300"
          >
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center gap-2">
          <Button
            type="submit"
            disabled={busy || (!body.trim() && !file && !linkUrl.trim())}
          >
            {busy ? t("common.loading") : t("thread.record")}
          </Button>
          {file && (
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (fileInput.current) fileInput.current.value = "";
              }}
              className="muted inline-flex items-center gap-1 text-xs hover:text-[var(--ink)]"
            >
              <Icon name="close" className="size-3.5" />
              {t("thread.removeFile")}
            </button>
          )}
        </div>
      </form>
    </Panel>
  );
}
