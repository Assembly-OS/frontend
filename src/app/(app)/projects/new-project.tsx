"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { Button, FIELD, Panel, Select } from "@/components/ui";
// From `project-vocab`, not `projects`: this is a Client Component, and
// that module opens a Postgres pool on import.
import { PROJECT_STATUSES } from "@/lib/project-vocab";
import type { MessageKey } from "@/lib/i18n";

/**
 * Opening a project.
 *
 * Three fields, one of them required. A project starts when somebody decides
 * it exists, usually mid-conversation, and a form asking for a code, a budget
 * and a percentage before it can be named is a form that gets skipped — the
 * work then lives in a chat for three months. Everything else is editable
 * from the project's own page once it is real.
 */
export function NewProject({ label }: { label: string }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string>("FAOL");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description, status }),
      });
      const data = (await response.json()) as { id?: number };
      if (!response.ok || !data.id) {
        setError(t("common.error"));
        setBusy(false);
        return;
      }
      // Straight into the new workspace: the next thing anybody does is open
      // its first thread, and landing back on the list would hide that.
      router.push(`/projects/${data.id}`);
      router.refresh();
    } catch {
      setError(t("common.error"));
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button icon="plus" onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  }

  return (
    <Panel className="w-full max-w-md p-5">
      <form onSubmit={create} className="space-y-3">
        <div>
          <label
            htmlFor="project-name"
            className="mb-1.5 block text-sm font-medium"
          >
            {t("proj.field.name")}
          </label>
          <input
            id="project-name"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("proj.field.namePlaceholder")}
            className={FIELD}
          />
        </div>

        <div>
          <label
            htmlFor="project-description"
            className="mb-1.5 block text-sm font-medium"
          >
            {t("proj.field.description")}
          </label>
          <textarea
            id="project-description"
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={`${FIELD} resize-y`}
          />
        </div>

        <div>
          <label
            htmlFor="project-status"
            className="mb-1.5 block text-sm font-medium"
          >
            {t("proj.field.status")}
          </label>
          <Select
            id="project-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {PROJECT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`proj.status.${value}` as MessageKey)}
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
          <Button type="submit" disabled={busy || !name.trim()}>
            {busy ? t("common.loading") : t("proj.create")}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("action.cancel")}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
