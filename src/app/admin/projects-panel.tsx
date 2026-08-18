"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import {
  Badge,
  Button,
  EmptyState,
  FIELD,
  Panel,
  ProgressBar,
  Select,
} from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/format";
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
        <Button type="button" disabled={busy} onClick={submit}>
          {busy
            ? t("admin.creating")
            : editing === null
              ? t("admin.create")
              : t("admin.save")}
        </Button>
        <Button type="button" variant="secondary" onClick={close}>
          {t("admin.cancel")}
        </Button>
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
        <Button
          type="button"
          icon="plus"
          onClick={() => {
            setValues(EMPTY);
            setCreating(true);
          }}
        >
          {t("admin.newProject")}
        </Button>
      )}

      {creating && (
        <Panel title={t("admin.newProject")}>
          <div className="p-4 lg:p-5">{form}</div>
        </Panel>
      )}

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
<Panel title={project.name}>
                  <div className="p-4 lg:p-5">{form}</div>
                </Panel>
              </div>
            ) : (
              <Panel key={project.id} className="p-4 lg:p-5">
                {/* The number is the one assembly.uz gives the project, so the
                    panel and the public site can be read side by side. */}
                <div className="flex items-start justify-between gap-3">
                  <p className="muted font-mono text-[11px] font-semibold uppercase tracking-wide">
                    {project.site_no === null
                      ? project.code
                      : `${String(project.site_no).padStart(2, "0")} · ${project.code}`}
                  </p>
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

                <h3 className="mt-1 text-sm font-semibold leading-snug">
                  {project.name}
                </h3>

                {/* Two lines, always: a clamp here keeps the row of cards level
                    without stretching any of them to a common height. */}
                {project.description && (
                  <p className="muted mt-1.5 line-clamp-2 text-xs leading-relaxed">
                    {project.description}
                  </p>
                )}

                <div className="mt-3.5">
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="muted text-[11px] font-semibold uppercase tracking-wide">
                      {t("admin.projectProgress")}
                    </span>
                    <span className="text-xs font-semibold tabular-nums">
                      {project.progress}%
                    </span>
                  </div>
                  <ProgressBar
                    value={project.progress}
                    tone={
                      project.progress >= 100 ? "bg-emerald-500" : "bg-navy-600"
                    }
                  />
                </div>

                {/* Label/value rather than "3 tasks": four languages, four
                    plural rules, and none of them worth encoding here. */}
                <dl className="mt-3.5 space-y-1 text-xs">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="muted shrink-0">{t("admin.projectOwner")}</dt>
                    <dd
                      className={`truncate text-right font-medium ${
                        project.owner_name ? "" : "muted"
                      }`}
                    >
                      {project.owner_name ?? t("admin.noOwner")}
                    </dd>
                  </div>

                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="muted shrink-0">{t("admin.projectTasks")}</dt>
                    <dd className="text-right font-medium tabular-nums">
                      {project.tasks}
                    </dd>
                  </div>

                  {project.deadline && (
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="muted shrink-0">
                        {t("admin.projectDeadline")}
                      </dt>
                      <dd className="text-right font-medium tabular-nums">
                        {formatDate(project.deadline)}
                      </dd>
                    </div>
                  )}

                  {project.budget > 0 && (
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="muted shrink-0">
                        {t("admin.projectBudget")}
                      </dt>
                      <dd className="text-right font-medium tabular-nums">
                        {formatNumber(project.budget)}
                      </dd>
                    </div>
                  )}
                </dl>

                <div className="mt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    block
                    onClick={() => {
                      setValues(toForm(project));
                      setEditing(project.id);
                      setCreating(false);
                    }}
                  >
                    {t("admin.edit")}
                  </Button>
                </div>
              </Panel>
            ),
          )}
        </div>
      )}
    </div>
  );
}
