"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { Button, FIELD, Panel, Select } from "@/components/ui";
// From `project-kinds`, not `project-threads`: this is a Client Component,
// and that module opens a Postgres pool on import.
import { THREAD_KINDS } from "@/lib/project-vocab";
import type { MessageKey } from "@/lib/i18n";

/**
 * Opening a thread inside a project.
 *
 * One field that matters — who or what this is about. The kind picker exists
 * because "Internal team" and "UNIDO" want different marks in the rail, and
 * that is all it changes.
 *
 * Linking the thread to a company in the CRM is deliberately not here. It is
 * a second decision ("which of the four rows called Huawei is this?") in the
 * middle of a first one, and it belongs on the thread once the thread exists.
 */
export function NewThread({
  projectId,
  label,
}: {
  projectId: number;
  label: string;
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<string>("ORG");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), kind }),
      });
      const data = (await response.json()) as { id?: number };
      if (!response.ok || !data.id) {
        setError(t("common.error"));
        setBusy(false);
        return;
      }
      router.push(`/projects/${projectId}/${data.id}`);
      router.refresh();
    } catch {
      setError(t("common.error"));
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button icon="plus" variant="secondary" onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  }

  return (
    <Panel className="w-full max-w-sm p-5">
      <form onSubmit={create} className="space-y-3">
        <div>
          <label
            htmlFor="thread-title"
            className="mb-1.5 block text-sm font-medium"
          >
            {t("thread.field.title")}
          </label>
          <input
            id="thread-title"
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("thread.field.titlePlaceholder")}
            className={FIELD}
          />
        </div>

        <div>
          <label
            htmlFor="thread-kind"
            className="mb-1.5 block text-sm font-medium"
          >
            {t("thread.field.kind")}
          </label>
          <Select
            id="thread-kind"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          >
            {THREAD_KINDS.map((value) => (
              <option key={value} value={value}>
                {t(`thread.kind.${value}` as MessageKey)}
              </option>
            ))}
          </Select>
        </div>

        {error && (
          <p
            role="alert"
            className="text-sm font-medium text-rose-700 dark:text-rose-300"
          >
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={busy || !title.trim()}>
            {busy ? t("common.loading") : t("thread.create")}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("action.cancel")}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
