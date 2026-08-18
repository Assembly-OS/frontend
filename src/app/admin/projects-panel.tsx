"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Icon } from "@/components/icons";
import { Badge, EmptyState, FIELD, Panel, Select } from "@/components/ui";
import type { MessageKey } from "@/lib/i18n";
// Type-only: `lib/admin` reaches for node:sqlite and must never reach the
// client bundle. `import type` is erased at compile time.
import type { ProjectRow } from "@/lib/admin";

const STATUSES = ["FAOL", "YAKUNLANMOQDA"] as const;

const ERRORS: Record<string, MessageKey> = {
  REQUIRED: "admin.errRequired",
  BAD_CODE: "admin.errCode",
  CODE_TAKEN: "admin.errCodeTaken",
};

interface FormValues {
  code: string;
  name: string;
  description: string;
  status: string;
  progress: string;
  budget: string;
  ownerId: string;
  deadline: string;
}

const EMPTY: FormValues = {
  code: "",
  name: "",
  description: "",
  status: "FAOL",
  progress: "0",
  budget: "0",
  ownerId: "",
  deadline: "",
};

function toForm(project: ProjectRow): FormValues {
  return {
    code: project.code,
    name: project.name,
    description: project.description ?? "",
    status: project.status,
    progress: String(project.progress),
    budget: String(project.budget),
    ownerId: project.owner_id === null ? "" : String(project.owner_id),
    deadline: project.deadline ?? "",
  };
}

export function ProjectsPanel({
  projects,
  owners,
}: {
  projects: ProjectRow[];
  owners: { id: number; label: string }[];
}) {
  const t = useT();
  const router = useRouter();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  function close() {
    setCreating(false);
    setEditing(null);
    setValues(EMPTY);
  }

  async function submit() {
    setBusy(true);
    setNotice(null);

    const payload = {
      code: values.code,
      name: values.name,
      description: values.description || null,
      status: values.status,
      progress: Number(values.progress) || 0,
      budget: Number(values.budget) || 0,
      ownerId: values.ownerId ? Number(values.ownerId) : null,
      deadline: values.deadline || null,
    };

    const response = await fetch(
      editing === null
        ? "/api/admin/projects"
        : `/api/admin/projects/${editing}`,
      {
        method: editing === null ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    setBusy(false);

    if (!response.ok) {
      const key = result.error ? ERRORS[result.error] : undefined;
      setNotice({ ok: false, text: key ? t(key) : t("admin.errFailed") });
      return;
    }

    setNotice({
      ok: true,
      text: editing === null ? t("admin.projectCreated") : t("admin.saved"),
    });
    close();
    router.refresh();
  }

  const form = (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="muted mb-1.5 block text-xs font-semibold uppercase tracking-wide">
            {t("admin.projectCode")}
          </span>
          <input
            className={`${FIELD} font-mono uppercase`}
            value={values.code}
            maxLength={16}
            onChange={(event) =>
              setValues({ ...values, code: event.target.value.toUpperCase() })
            }
          />
        </label>

        <label className="block">
          <span className="muted mb-1.5 block text-xs font-semibold uppercase tracking-wide">
            {t("admin.projectName")}
          </span>
          <input
            className={FIELD}
            value={values.name}
            maxLength={120}
            onChange={(event) =>
              setValues({ ...values, name: event.target.value })
            }
          />
        </label>
      </div>

      <label className="block">
        <span className="muted mb-1.5 block text-xs font-semibold uppercase tracking-wide">
          {t("admin.projectDescription")}
        </span>
        <textarea
          className={`${FIELD} min-h-24 resize-y`}
          value={values.description}
          maxLength={2000}
          onChange={(event) =>
            setValues({ ...values, description: event.target.value })
          }
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="muted mb-1.5 block text-xs font-semibold uppercase tracking-wide">
            {t("admin.projectStatus")}
          </span>
          <Select
            value={values.status}
            onChange={(event) =>
              setValues({ ...values, status: event.target.value })
            }
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status === "FAOL"
                  ? t("admin.projectActive")
                  : t("admin.projectClosing")}
              </option>
            ))}
          </Select>
        </label>

        <label className="block">
          <span className="muted mb-1.5 block text-xs font-semibold uppercase tracking-wide">
            {t("admin.projectProgress")}
          </span>
          <input
            type="number"
            min={0}
            max={100}
            className={`${FIELD} tabular-nums`}
            value={values.progress}
            onChange={(event) =>
              setValues({ ...values, progress: event.target.value })
            }
          />
        </label>

        <label className="block">
          <span className="muted mb-1.5 block text-xs font-semibold uppercase tracking-wide">
            {t("admin.projectBudget")}
          </span>
          <input
            type="number"
            min={0}
            className={`${FIELD} tabular-nums`}
            value={values.budget}
            onChange={(event) =>
              setValues({ ...values, budget: event.target.value })
            }
          />
        </label>

        <label className="block">
          <span className="muted mb-1.5 block text-xs font-semibold uppercase tracking-wide">
            {t("admin.projectDeadline")}
          </span>
          <input
            type="date"
            className={`${FIELD} tabular-nums`}
            value={values.deadline}
            onChange={(event) =>
              setValues({ ...values, deadline: event.target.value })
            }
          />
        </label>
      </div>

      <label className="block">
        <span className="muted mb-1.5 block text-xs font-semibold uppercase tracking-wide">
          {t("admin.projectOwner")}
        </span>
        <Select
          value={values.ownerId}
          onChange={(event) =>
            setValues({ ...values, ownerId: event.target.value })
          }
        >
          <option value="">{t("admin.noOwner")}</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.label}
            </option>
          ))}
        </Select>
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60 dark:bg-navy-600"
        >
          {busy
            ? t("admin.creating")
            : editing === null
              ? t("admin.create")
              : t("admin.save")}
        </button>
        <button
          type="button"
          onClick={close}
          className="muted rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:opacity-80"
        >
          {t("admin.cancel")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {notice && (
        <p
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            notice.ok
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/10 text-rose-600 dark:text-rose-300"
          }`}
        >
          {notice.text}
        </p>
      )}

      {!creating && editing === null && (
        <button
          type="button"
          onClick={() => {
            setValues(EMPTY);
            setCreating(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 dark:bg-navy-600"
        >
          <Icon name="plus" className="size-4" />
          {t("admin.newProject")}
        </button>
      )}

      {creating && <Panel title={t("admin.newProject")}>{form}</Panel>}

      {projects.length === 0 && !creating ? (
        <EmptyState
          text={t("admin.noProjects")}
          hint={t("admin.noProjectsHint")}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 items-start">
          {projects.map((project) =>
            editing === project.id ? (
              <div key={project.id} className="sm:col-span-2 xl:col-span-3">
                <Panel title={project.name}>{form}</Panel>
              </div>
            ) : (
              <Panel key={project.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="muted font-mono text-[11px] font-semibold uppercase tracking-wide">
                      {project.site_no === null
                        ? project.code
                        : `${String(project.site_no).padStart(2, "0")} · ${project.code}`}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-semibold">
                      {project.name}
                    </p>
                  </div>
                  <Badge
                    className={
                      project.status === "FAOL"
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30"
                        : "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30"
                    }
                  >
                    {project.status === "FAOL"
                      ? t("admin.projectActive")
                      : t("admin.projectClosing")}
                  </Badge>
                </div>

                {project.description && (
                  <p className="muted mt-2 line-clamp-3 text-xs">
                    {project.description}
                  </p>
                )}

                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="muted">{t("admin.projectProgress")}</dt>
                    <dd className="font-semibold tabular-nums">
                      {project.progress}%
                    </dd>
                  </div>
                  <div>
                    <dt className="muted">{t("admin.projectTasks")}</dt>
                    <dd className="font-semibold tabular-nums">
                      {project.tasks}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="muted">{t("admin.projectOwner")}</dt>
                    <dd className="truncate font-medium">
                      {project.owner_name ?? t("admin.noOwner")}
                    </dd>
                  </div>
                </dl>

                <button
                  type="button"
                  onClick={() => {
                    setValues(toForm(project));
                    setEditing(project.id);
                    setCreating(false);
                  }}
                  className="muted mt-3 rounded-xl border px-3 py-2 text-xs font-medium transition hover:opacity-80"
                >
                  {t("admin.edit")}
                </button>
              </Panel>
            ),
          )}
        </div>
      )}
    </div>
  );
}
