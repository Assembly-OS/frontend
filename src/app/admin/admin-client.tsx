"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Icon } from "@/components/icons";
import { Lightbox } from "@/components/lightbox";
import {
  Badge,
  EmptyState,
  FIELD,
  PageHeader,
  Panel,
  Select,
  StatCard,
} from "@/components/ui";
import {
  formatBytes,
  formatChatTime,
  formatDateTime,
  formatDuration,
} from "@/lib/format";
import { DEPARTMENTS, ROLES, statusTone, type Role } from "@/lib/types";
import type { MessageKey } from "@/lib/i18n";
// Type-only: these modules reach for node:sqlite and node:fs, and must never
// be pulled into the client bundle. `import type` is erased at compile time.
import type {
  AuditMessage,
  ConversationSummary,
  GroupOverview,
  ProjectRow,
  StaffRow,
} from "@/lib/admin";
import type { DbStats, DevEvent, OnlineUser, SystemInfo } from "@/lib/dev";
import type { AgentSpec } from "@/lib/agents/registry";
import type { ProposalView, RunRow } from "@/lib/agents/orchestrator";
import { AgentsPanel } from "./agents-panel";
import { ProjectsPanel } from "./projects-panel";

/** Maps a server error code onto a message the administrator can act on. */
const ERRORS: Record<string, MessageKey> = {
  REQUIRED: "admin.errRequired",
  BAD_LOGIN: "admin.errLogin",
  WEAK_PASSWORD: "admin.errWeak",
  LOGIN_TAKEN: "admin.errTaken",
  LAST_RAIS: "admin.errLastRais",
  SELF: "admin.errSelf",
};

/** Readable random password — no look-alike glyphs to mistype over the phone. */
function newPassword(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyzACDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** Stands in for an attachment whose caption is empty, so no preview is blank. */
function kindLabel(
  kind: AuditMessage["kind"],
  t: (key: MessageKey) => string,
): string {
  if (kind === "photo") return t("chat.photo");
  if (kind === "voice") return t("chat.voice");
  if (kind === "file") return t("chat.file");
  return "";
}

function bytes(value: number): string {
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(value / 1024)} KB`;
}

function uptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

interface FormValues {
  fullName: string;
  login: string;
  password: string;
  role: Role;
  department: string;
  position: string;
  managerId: string;
  phone: string;
  email: string;
}

const EMPTY: FormValues = {
  fullName: "",
  login: "",
  password: "",
  role: "ISHCHI",
  department: "",
  position: "",
  managerId: "",
  phone: "",
  email: "",
};

/* ------------------------------------------------------------------ */
/* The one form, worn by both "add" and "edit"                        */
/* ------------------------------------------------------------------ */

function StaffForm({
  mode,
  values,
  managers,
  busy,
  onChange,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  values: FormValues;
  managers: { id: number; label: string }[];
  busy: boolean;
  onChange: (next: FormValues) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    onChange({ ...values, [key]: value });

  const label = "mb-1.5 block text-sm font-medium";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="grid grid-cols-[minmax(0,1fr)] gap-4 p-5 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <label className={label} htmlFor="fullName">
          {t("admin.fullName")} *
        </label>
        <input
          id="fullName"
          value={values.fullName}
          onChange={(e) => set("fullName", e.target.value)}
          className={FIELD}
          autoComplete="off"
          required
        />
      </div>

      {/* A login is an identity other rows point at, so it is set once. */}
      {mode === "create" && (
        <>
          <div>
            <label className={label} htmlFor="login">
              {t("admin.login")} *
            </label>
            <input
              id="login"
              value={values.login}
              onChange={(e) => set("login", e.target.value.toLowerCase())}
              className={`${FIELD} font-mono`}
              placeholder="ism.familiya"
              autoComplete="off"
              required
            />
          </div>
          <div>
            <label className={label} htmlFor="password">
              {t("admin.password")} *
            </label>
            <div className="flex gap-2">
              <input
                id="password"
                value={values.password}
                onChange={(e) => set("password", e.target.value)}
                className={`${FIELD} font-mono`}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => set("password", newPassword())}
                className="shrink-0 rounded-xl border px-3 text-sm font-medium transition hover:bg-[var(--surface)]"
              >
                {t("admin.generate")}
              </button>
            </div>
          </div>
        </>
      )}

      <div>
        <label className={label} htmlFor="role">
          {t("admin.role")}
        </label>
        <Select
          id="role"
          value={values.role}
          onChange={(e) => set("role", e.target.value as Role)}
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {t(`role.${role}` as MessageKey)}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className={label} htmlFor="department">
          {t("admin.department")}
        </label>
        <Select
          id="department"
          value={values.department}
          onChange={(e) => set("department", e.target.value)}
        >
          <option value="">{t("admin.noDepartment")}</option>
          {DEPARTMENTS.map((dept) => (
            <option key={dept} value={dept}>
              {t(`dept.${dept}` as MessageKey)}
            </option>
          ))}
        </Select>
      </div>

      <div className="sm:col-span-2">
        <label className={label} htmlFor="position">
          {t("admin.position")}
        </label>
        <input
          id="position"
          value={values.position}
          onChange={(e) => set("position", e.target.value)}
          className={FIELD}
          placeholder="GR bo'limi bosh mutaxassisi"
          autoComplete="off"
        />
      </div>

      <div className="sm:col-span-2">
        <label className={label} htmlFor="managerId">
          {t("admin.manager")}
        </label>
        <Select
          id="managerId"
          value={values.managerId}
          onChange={(e) => set("managerId", e.target.value)}
        >
          <option value="">{t("admin.noManager")}</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className={label} htmlFor="phone">
          {t("admin.phone")}
        </label>
        <input
          id="phone"
          value={values.phone}
          onChange={(e) => set("phone", e.target.value)}
          className={FIELD}
          autoComplete="off"
          inputMode="tel"
        />
      </div>

      <div>
        <label className={label} htmlFor="email">
          {t("admin.email")}
        </label>
        <input
          id="email"
          type="email"
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
          className={FIELD}
          autoComplete="off"
        />
      </div>

      <div className="flex gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-50 dark:bg-navy-600"
        >
          {busy
            ? t("admin.creating")
            : mode === "create"
              ? t("admin.create")
              : t("admin.save")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border px-5 py-2.5 text-sm font-medium transition hover:bg-[var(--surface)]"
        >
          {t("admin.cancel")}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Chat oversight                                                     */
/* ------------------------------------------------------------------ */

/** One archived message, rendered plainly — this is a record, not a chat UI. */
function AuditBubble({
  message,
  onDelete,
  busy,
}: {
  message: AuditMessage;
  onDelete: () => void;
  busy: boolean;
}) {
  const t = useT();
  const [viewing, setViewing] = useState(false);
  const url = `/api/files/${message.id}`;
  const caption = message.file_name ?? t("chat.photo");

  return (
    <li className="flex gap-3 px-5 py-3">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-xs">
          <span className="font-semibold">{message.from_name}</span>
          <span className="muted font-mono">@{message.from_login}</span>
          <span className="muted">{formatChatTime(message.created_at)}</span>
          <span className="muted">
            · {message.read_at ? t("admin.readAt") : t("admin.unread")}
          </span>
        </p>

        {message.kind === "photo" && (
          <>
            <button type="button" onClick={() => setViewing(true)}>
              {/* Plain <img>: the optimizer fetches without the admin cookie. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={message.file_name ?? ""}
                loading="lazy"
                className="mt-1.5 h-auto max-h-40 w-auto max-w-full rounded-lg object-contain"
              />
            </button>
            {viewing && (
              <Lightbox
                src={url}
                alt={caption}
                label={t("chat.closeImage")}
                onClose={() => setViewing(false)}
              />
            )}
          </>
        )}
        {message.kind === "voice" && (
          <span className="mt-1.5 flex items-center gap-2">
            <audio controls preload="none" src={url} className="h-8 w-52" />
            <span className="muted font-mono text-[11px]">
              {formatDuration(message.duration)}
            </span>
          </span>
        )}
        {message.kind === "file" && (
          <a
            href={url}
            download={message.file_name ?? undefined}
            className="mt-1.5 flex items-center gap-2 text-sm text-navy-700 underline underline-offset-2 dark:text-gold-400"
          >
            <Icon name="file" className="size-4 shrink-0" />
            <span className="truncate">{message.file_name}</span>
            <span className="muted shrink-0 text-[11px]">
              {formatBytes(message.file_size)}
            </span>
          </a>
        )}

        {message.body && (
          <p className="mt-1 whitespace-pre-wrap break-words text-sm">
            {message.body}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        title={t("admin.deleteMessage")}
        className="muted grid size-8 shrink-0 place-items-center rounded-lg border transition hover:text-rose-600 disabled:opacity-40"
      >
        <Icon name="trash" className="size-4" />
      </button>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export function AdminClient({
  staff,
  managers,
  projects,
  stats,
  online,
  events,
  system,
  chats,
  groups,
  agents,
  agentRuns,
  agentProposals,
  llmConfigured,
}: {
  staff: StaffRow[];
  managers: { id: number; label: string }[];
  projects: ProjectRow[];
  stats: DbStats;
  online: OnlineUser[];
  events: DevEvent[];
  system: SystemInfo;
  chats: ConversationSummary[];
  groups: GroupOverview[];
  agents: AgentSpec[];
  agentRuns: RunRow[];
  agentProposals: ProposalView[];
  llmConfigured: boolean;
}) {
  const t = useT();
  const router = useRouter();

  const [tab, setTab] = useState<"staff" | "projects" | "chats" | "agents" | "panel">(
    "staff",
  );
  // The open conversation, and its messages once fetched on demand — threads
  // are not shipped with the page, only the list of them.
  const [pair, setPair] = useState<ConversationSummary | null>(null);
  const [openGroup, setOpenGroup] = useState<GroupOverview | null>(null);
  const [thread, setThread] = useState<AuditMessage[] | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  /**
   * Passwords issued during this panel session, newest first.
   *
   * They are shown here and nowhere else: the database keeps a scrypt hash, so
   * a password that leaves this list cannot be recovered, only replaced. That
   * is why the list accumulates instead of holding the last one — resetting
   * five people in a row should leave five credentials to hand out, not four
   * lost ones. It lives in component state, so a reload clears it.
   */
  const [issued, setIssued] = useState<
    { login: string; password: string; name: string }[]
  >([]);

  function issue(login: string, password: string, name: string) {
    setIssued((current) => [
      { login, password, name },
      ...current.filter((entry) => entry.login !== login),
    ]);
  }

  const activeCount = staff.filter((person) => person.is_active === 1).length;

  function fail(code: string) {
    setNotice({ ok: false, text: t(ERRORS[code] ?? "admin.errFailed") });
  }

  async function send(url: string, method: string, payload: unknown) {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        fail(data.error ?? "");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      fail("");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    const ok = await send("/api/admin/users", "POST", {
      ...values,
      managerId: values.managerId ? Number(values.managerId) : null,
      department: values.department || null,
    });
    if (ok) {
      issue(values.login, values.password, values.fullName);
      setNotice({ ok: true, text: t("admin.created") });
      setValues(EMPTY);
      setCreating(false);
    }
  }

  async function saveEdit(id: number) {
    const ok = await send(`/api/admin/users/${id}`, "PATCH", {
      action: "update",
      ...values,
      managerId: values.managerId ? Number(values.managerId) : null,
      department: values.department || null,
    });
    if (ok) {
      setNotice({ ok: true, text: t("admin.saved") });
      setEditing(null);
      setValues(EMPTY);
    }
  }

  async function toggle(person: StaffRow) {
    if (person.is_active === 1 && !confirm(t("admin.confirmDeactivate"))) return;
    await send(`/api/admin/users/${person.id}`, "PATCH", { action: "toggle" });
  }

  async function resetPassword(person: StaffRow) {
    const password = newPassword();
    const ok = await send(`/api/admin/users/${person.id}`, "PATCH", {
      action: "password",
      password,
    });
    if (ok) {
      issue(person.login, password, person.full_name);
      setNotice({ ok: true, text: t("admin.passwordSet") });
    }
  }

  async function openGroupThread(summary: GroupOverview) {
    setPair(null);
    setOpenGroup(summary);
    setThread(null);
    setLoadingThread(true);
    try {
      const response = await fetch(`/api/admin/chats?group=${summary.id}`);
      if (!response.ok) throw new Error("load failed");
      const data = (await response.json()) as { messages: AuditMessage[] };
      setThread(data.messages);
    } catch {
      fail("");
      setOpenGroup(null);
    } finally {
      setLoadingThread(false);
    }
  }

  async function openThread(summary: ConversationSummary) {
    setOpenGroup(null);
    setPair(summary);
    setThread(null);
    setLoadingThread(true);
    try {
      const response = await fetch(
        `/api/admin/chats?a=${summary.a}&b=${summary.b}`,
      );
      if (!response.ok) throw new Error("load failed");
      const data = (await response.json()) as { messages: AuditMessage[] };
      setThread(data.messages);
    } catch {
      fail("");
      setPair(null);
    } finally {
      setLoadingThread(false);
    }
  }

  async function deleteMessage(messageId: number) {
    if (!confirm(t("admin.confirmDeleteMessage"))) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/chats/${messageId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("delete failed");
      setThread((list) =>
        list ? list.filter((m) => m.id !== messageId) : list,
      );
      setNotice({ ok: true, text: t("admin.messageDeleted") });
      // The conversation list carries counts and a last message — both moved.
      router.refresh();
    } catch {
      fail("");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(person: StaffRow) {
    setCreating(false);
    setEditing(person.id);
    setValues({
      fullName: person.full_name,
      login: person.login,
      password: "",
      role: person.role,
      department: person.department ?? "",
      position: person.position ?? "",
      managerId: person.manager_id ? String(person.manager_id) : "",
      phone: person.phone ?? "",
      email: person.email ?? "",
    });
  }

  return (
    <>
      <PageHeader
        title={t("admin.title")}
        description={t("admin.subtitle")}
        action={
          tab === "staff" && !creating && editing === null ? (
            <button
              type="button"
              onClick={() => {
                setValues({ ...EMPTY, password: newPassword() });
                setCreating(true);
                          }}
              className="flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 dark:bg-navy-600"
            >
              <Icon name="plus" className="size-4" />
              {t("admin.newStaff")}
            </button>
          ) : undefined
        }
      />

      <div className="mb-5 flex gap-1 rounded-xl bg-[var(--surface)] p-1 sm:w-fit">
        {(["staff", "projects", "chats", "agents", "panel"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition sm:flex-none ${
              tab === value
                ? "bg-navy-900 text-white dark:bg-navy-600"
                : "muted hover:opacity-80"
            }`}
          >
            {value === "staff"
              ? t("admin.tabStaff")
              : value === "projects"
                ? t("admin.tabProjects")
                : value === "chats"
                ? t("admin.tabChats")
                : value === "agents"
                  ? t("admin.tabAgents")
                  : t("admin.tabPanel")}
          </button>
        ))}
      </div>

      {notice && (
        <p
          className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${
            notice.ok
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/10 text-rose-600 dark:text-rose-300"
          }`}
        >
          {notice.text}
        </p>
      )}

      {issued.length > 0 && (
        <div className="mb-4 rounded-xl border border-gold-500/40 bg-gold-500/10 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide">
              {t("admin.issued")}
            </p>
            <button
              type="button"
              onClick={() => setIssued([])}
              className="muted text-xs font-medium transition hover:opacity-80"
            >
              {t("admin.dismiss")}
            </button>
          </div>

          <ul className="mt-2 space-y-1.5">
            {issued.map((entry) => (
              <li
                key={entry.login}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm"
              >
                <span className="font-mono font-semibold">{entry.login}</span>
                <span className="muted">·</span>
                <span className="font-mono font-semibold">{entry.password}</span>
                <span className="muted truncate text-xs">{entry.name}</span>
              </li>
            ))}
          </ul>

          <p className="muted mt-2 text-xs">{t("admin.copyNow")}</p>
        </div>
      )}

      {tab === "staff" ? (
        <div className="space-y-5">
          {creating && (
            <Panel title={t("admin.newStaff")}>
              <StaffForm
                mode="create"
                values={values}
                managers={managers}
                busy={busy}
                onChange={setValues}
                onSubmit={create}
                onCancel={() => {
                  setCreating(false);
                  setValues(EMPTY);
                }}
              />
            </Panel>
          )}

          {editing !== null && (
            <Panel title={t("admin.edit")}>
              <StaffForm
                mode="edit"
                values={values}
                managers={managers}
                busy={busy}
                onChange={setValues}
                onSubmit={() => saveEdit(editing)}
                onCancel={() => {
                  setEditing(null);
                  setValues(EMPTY);
                }}
              />
            </Panel>
          )}

          <Panel
            title={`${t("admin.staffCount")}: ${activeCount} / ${staff.length}`}
          >
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="muted border-b text-left text-xs">
                  <tr>
                    <th className="px-5 py-3 font-semibold">
                      {t("admin.fullName")}
                    </th>
                    <th className="px-3 py-3 font-semibold">
                      {t("admin.role")}
                    </th>
                    <th className="px-3 py-3 font-semibold">
                      {t("admin.department")}
                    </th>
                    <th className="px-3 py-3 font-semibold">
                      {t("admin.manager")}
                    </th>
                    <th className="px-3 py-3 text-right font-semibold">
                      {t("admin.tasksCount")}
                    </th>
                    <th className="px-3 py-3 font-semibold">
                      {t("admin.lastSeen")}
                    </th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {staff.map((person) => (
                    <tr
                      key={person.id}
                      className={`border-b last:border-0 ${
                        person.is_active ? "" : "opacity-55"
                      }`}
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium">{person.full_name}</p>
                        <p className="muted text-xs">
                          <span className="font-mono">@{person.login}</span>
                          {person.position ? ` · ${person.position}` : ""}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        {t(`role.${person.role}` as MessageKey)}
                      </td>
                      <td className="muted px-3 py-3 text-xs">
                        {person.department
                          ? t(`dept.${person.department}` as MessageKey).split(
                              " — ",
                            )[0]
                          : "—"}
                      </td>
                      <td className="muted px-3 py-3 text-xs">
                        {person.manager_name ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {person.tasks}
                      </td>
                      <td className="muted px-3 py-3 text-xs">
                        {person.last_seen
                          ? formatDateTime(person.last_seen)
                          : t("admin.never")}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Badge
                            className={
                              person.is_active
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30"
                                : "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/30"
                            }
                          >
                            {person.is_active
                              ? t("admin.active")
                              : t("admin.inactive")}
                          </Badge>
                          <button
                            type="button"
                            onClick={() => startEdit(person)}
                            disabled={busy}
                            title={t("admin.edit")}
                            className="muted grid size-8 place-items-center rounded-lg border transition hover:bg-[var(--surface)] disabled:opacity-40"
                          >
                            <Icon name="user" className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void resetPassword(person)}
                            disabled={busy}
                            title={t("admin.resetPassword")}
                            className="muted grid size-8 place-items-center rounded-lg border transition hover:bg-[var(--surface)] disabled:opacity-40"
                          >
                            <Icon name="shield" className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void toggle(person)}
                            disabled={busy}
                            title={
                              person.is_active
                                ? t("admin.deactivate")
                                : t("admin.activate")
                            }
                            className="muted grid size-8 place-items-center rounded-lg border transition hover:bg-[var(--surface)] disabled:opacity-30"
                          >
                            <Icon
                              name={person.is_active ? "close" : "check"}
                              className="size-4"
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      ) : tab === "projects" ? (
        <ProjectsPanel projects={projects} owners={managers} />
      ) : tab === "agents" ? (
        <AgentsPanel
          agents={agents}
          runs={agentRuns}
          proposals={agentProposals}
          llmConfigured={llmConfigured}
        />
      ) : tab === "chats" ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <div className="space-y-5">
          <Panel title={`${t("chat.tabGroups")}: ${groups.length}`}>
            {groups.length === 0 ? (
              <p className="muted px-5 py-6 text-sm">{t("chat.noGroups")}</p>
            ) : (
              <ul className="scroll-thin max-h-64 divide-y overflow-y-auto">
                {groups.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => void openGroupThread(item)}
                      className={`w-full px-5 py-3 text-left transition ${
                        openGroup?.id === item.id
                          ? "bg-[var(--surface)]"
                          : "hover:bg-[var(--surface)]"
                      }`}
                    >
                      <p className="flex items-center gap-2 truncate text-sm font-medium">
                        <Icon name="users" className="size-4 shrink-0" />
                        {item.title}
                      </p>
                      <p className="muted mt-0.5 truncate text-xs">
                        {item.member_names}
                      </p>
                      <p className="muted mt-1 flex items-center gap-2 text-[11px]">
                        <span>
                          {t("admin.messages")}: {item.total}
                        </span>
                        {item.attachments > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Icon name="paperclip" className="size-3" />
                            {item.attachments}
                          </span>
                        )}
                        {item.last_at && (
                          <span className="ml-auto">
                            {formatChatTime(item.last_at)}
                          </span>
                        )}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={`${t("admin.conversations")}: ${chats.length}`}>
            {chats.length === 0 ? (
              <p className="muted px-5 py-8 text-sm">{t("admin.noChats")}</p>
            ) : (
              <ul className="scroll-thin max-h-[34rem] divide-y overflow-y-auto">
                {chats.map((item) => {
                  const open = pair?.a === item.a && pair?.b === item.b;
                  return (
                    <li key={`${item.a}-${item.b}`}>
                      <button
                        type="button"
                        onClick={() => void openThread(item)}
                        className={`w-full px-5 py-3 text-left transition ${
                          open
                            ? "bg-[var(--surface)]"
                            : "hover:bg-[var(--surface)]"
                        }`}
                      >
                        <p className="truncate text-sm font-medium">
                          {item.a_name} ↔ {item.b_name}
                        </p>
                        <p className="muted mt-0.5 truncate text-xs">
                          {item.last_body || kindLabel(item.last_kind, t)}
                        </p>
                        <p className="muted mt-1 flex items-center gap-2 text-[11px]">
                          <span>
                            {t("admin.messages")}: {item.total}
                          </span>
                          {item.attachments > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Icon name="paperclip" className="size-3" />
                              {item.attachments}
                            </span>
                          )}
                          <span className="ml-auto">
                            {formatChatTime(item.last_at)}
                          </span>
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
          </div>

          <Panel
            title={
              openGroup
                ? openGroup.title
                : pair
                  ? `${pair.a_name} ↔ ${pair.b_name}`
                  : t("admin.tabChats")
            }
          >
            {!pair && !openGroup ? (
              <p className="muted px-5 py-10 text-center text-sm">
                {t("admin.selectThread")}
              </p>
            ) : loadingThread ? (
              <p className="muted px-5 py-10 text-center text-sm">
                {t("admin.loadingThread")}
              </p>
            ) : thread && thread.length > 0 ? (
              <ul className="scroll-thin max-h-[34rem] divide-y overflow-y-auto">
                {thread.map((message) => (
                  <AuditBubble
                    key={message.id}
                    message={message}
                    busy={busy}
                    onDelete={() => void deleteMessage(message.id)}
                  />
                ))}
              </ul>
            ) : (
              <p className="muted px-5 py-10 text-center text-sm">
                {t("common.noData")}
              </p>
            )}
          </Panel>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label={t("admin.totalUsers")}
              value={`${activeCount}/${staff.length}`}
              icon="users"
              tone="navy"
            />
            <StatCard
              label={t("admin.onlineNow")}
              value={online.length}
              icon="user"
              tone="emerald"
            />
            <StatCard
              label={t("nav.tasks")}
              value={stats.counts.tasks ?? 0}
              icon="inbox"
              tone="gold"
            />
            <StatCard
              label={t("admin.dbSize")}
              value={bytes(stats.files.db)}
              hint={`WAL ${bytes(stats.files.wal)}`}
              icon="chart"
              tone="slate"
            />
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
            <Panel title={t("admin.system")}>
              <dl className="divide-y text-sm">
                {[
                  [t("admin.env"), system.env],
                  [t("admin.nodeVersion"), system.node],
                  [t("admin.uptime"), uptime(system.uptimeSec)],
                  ["Version", system.version],
                ].map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between px-5 py-2.5"
                  >
                    <dt className="muted">{key}</dt>
                    <dd className="font-mono text-xs">{value}</dd>
                  </div>
                ))}
              </dl>
            </Panel>

            <Panel title={t("admin.database")}>
              <dl className="divide-y text-sm">
                {Object.entries(stats.counts).map(([table, count]) => (
                  <div
                    key={table}
                    className="flex items-center justify-between px-5 py-2.5"
                  >
                    <dt className="muted font-mono text-xs">{table}</dt>
                    <dd className="font-semibold tabular-nums">{count}</dd>
                  </div>
                ))}
              </dl>
            </Panel>

            <Panel title={t("admin.onlineNow")}>
              {online.length === 0 ? (
                <p className="muted px-5 py-6 text-sm">
                  {t("admin.nobodyOnline")}
                </p>
              ) : (
                <ul className="divide-y">
                  {online.map((person) => (
                    <li
                      key={person.id}
                      className="flex items-center gap-2.5 px-5 py-2.5 text-sm"
                    >
                      <span className="size-2 shrink-0 rounded-full bg-emerald-500" />
                      <span className="font-medium">{person.full_name}</span>
                      <span className="muted ml-auto text-xs">
                        {t(`role.${person.role}` as MessageKey)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title={t("admin.tasksByStatus")}>
              {stats.byStatus.length === 0 ? (
                <p className="muted px-5 py-6 text-sm">{t("common.noData")}</p>
              ) : (
                <ul className="divide-y">
                  {stats.byStatus.map((slice) => (
                    <li
                      key={slice.status}
                      className="flex items-center justify-between px-5 py-2.5 text-sm"
                    >
                      <Badge className={statusTone(slice.status)}>
                        {t(`status.${slice.status}` as MessageKey)}
                      </Badge>
                      <span className="font-semibold tabular-nums">
                        {slice.count}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel title={t("admin.recentEvents")}>
            {events.length === 0 ? (
              <EmptyState text={t("admin.noEvents")} />
            ) : (
              <ul className="divide-y">
                {events.map((event) => (
                  <li
                    key={event.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 text-sm"
                  >
                    <span className="font-mono text-xs font-semibold">
                      {event.code}
                    </span>
                    <span>{event.action}</span>
                    <span className="muted text-xs">{event.actor}</span>
                    <span className="muted ml-auto text-xs">
                      {formatDateTime(event.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}
