"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Badge, Button, EmptyState, FIELD, IconButton, Panel } from "@/components/ui";
import {
  EMPTY_STAFF,
  newPassword,
  StaffForm,
  type StaffValues,
} from "@/components/staff-form";
import { formatDateTime, initials } from "@/lib/format";
import type { MessageKey } from "@/lib/i18n";
// Type-only: `lib/admin` opens a database pool and must never be bundled into
// the client. `import type` is erased at compile time.
import type { StaffRow } from "@/lib/admin";

/**
 * Staff administration, in the platform.
 *
 * The `/admin` panel could always do this, but it is a locked cupboard with
 * its own key kept on the server — meant for recovering the install, not for
 * the Tuesday morning when somebody joins. So the chairman and his assistant
 * get the same powers here, where they already are: add a colleague, hand over
 * a login and a password, correct a title, switch access off.
 *
 * A password is shown once, in the clear, and never again: it is stored as a
 * scrypt hash, so nobody — including this page — can read it back. That single
 * reveal is the whole handover, which is why it gets a copy button rather than
 * a line of small print.
 */

/** Maps a server error code onto something the reader can act on. */
const ERRORS: Record<string, MessageKey> = {
  REQUIRED: "admin.errRequired",
  BAD_LOGIN: "admin.errLogin",
  WEAK_PASSWORD: "admin.errWeak",
  LOGIN_TAKEN: "admin.errTaken",
  LAST_RAIS: "admin.errLastRais",
  HAS_HISTORY: "admin.errHasHistory",
  SELF: "admin.errSelf",
  FORBIDDEN: "staff.forbidden",
};

/** Below this a search box is chrome: the whole list fits on one screen. */
const SEARCH_FROM = 8;

export function StaffPanel({
  staff,
  managers,
  selfId,
}: {
  staff: StaffRow[];
  managers: { id: number; label: string }[];
  selfId: number;
}) {
  const t = useT();
  const router = useRouter();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [values, setValues] = useState<StaffValues>(EMPTY_STAFF);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [revealed, setRevealed] = useState<{
    name: string;
    login: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const activeCount = staff.filter((person) => person.is_active === 1).length;

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return staff;
    return staff.filter((person) =>
      `${person.full_name} ${person.login} ${person.position ?? ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [staff, query]);

  function fail(code: string) {
    setNotice({ ok: false, text: t(ERRORS[code] ?? "admin.errFailed") });
  }

  async function send(url: string, method: string, payload: unknown) {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(url, {
        method,
        // A DELETE carries no body, and sending an empty one with a JSON
        // content type is a request the route would have to special-case.
        headers:
          payload === undefined
            ? undefined
            : { "Content-Type": "application/json" },
        body: payload === undefined ? undefined : JSON.stringify(payload),
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
    const ok = await send("/api/staff", "POST", {
      ...values,
      managerId: values.managerId ? Number(values.managerId) : null,
      department: values.department || null,
    });
    if (ok) {
      setRevealed({
        name: values.fullName,
        login: values.login,
        password: values.password,
      });
      setCopied(false);
      setNotice({ ok: true, text: t("admin.created") });
      setValues(EMPTY_STAFF);
      setCreating(false);
    }
  }

  async function saveEdit(id: number) {
    const ok = await send(`/api/staff/${id}`, "PATCH", {
      action: "update",
      ...values,
      managerId: values.managerId ? Number(values.managerId) : null,
      department: values.department || null,
    });
    if (ok) {
      setNotice({ ok: true, text: t("admin.saved") });
      setEditing(null);
      setValues(EMPTY_STAFF);
    }
  }

  async function toggle(person: StaffRow) {
    if (person.is_active === 1 && !confirm(t("admin.confirmDeactivate"))) return;
    await send(`/api/staff/${person.id}`, "PATCH", { action: "toggle" });
  }

  /**
   * Taking an account off the books entirely, for the case deactivating does
   * not cover: one created by mistake, or a duplicate. The server decides
   * whether it is allowed — anyone with tasks or messages behind them comes
   * back as "deactivate instead", which is the honest answer.
   */
  async function discard(person: StaffRow) {
    if (!confirm(t("admin.confirmDelete").replace("{name}", person.full_name)))
      return;
    const ok = await send(`/api/staff/${person.id}`, "DELETE", undefined);
    if (ok) setNotice({ ok: true, text: t("admin.deleted") });
  }

  async function resetPassword(person: StaffRow) {
    const password = newPassword();
    const ok = await send(`/api/staff/${person.id}`, "PATCH", {
      action: "password",
      password,
    });
    if (ok) {
      setRevealed({
        name: person.full_name,
        login: person.login,
        password,
      });
      setCopied(false);
      setNotice({ ok: true, text: t("admin.passwordSet") });
    }
  }

  function startCreate() {
    setEditing(null);
    setRevealed(null);
    setValues({ ...EMPTY_STAFF, password: newPassword() });
    setCreating(true);
  }

  function startEdit(person: StaffRow) {
    setCreating(false);
    setRevealed(null);
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

  async function copyCredentials() {
    if (!revealed) return;
    try {
      await navigator.clipboard.writeText(
        `${revealed.login} / ${revealed.password}`,
      );
      setCopied(true);
    } catch {
      /* clipboard blocked — the pair is on screen to be read off it */
    }
  }

  return (
    <Panel
      title={`${t("staff.title")} · ${activeCount}/${staff.length}`}
      action={
        creating || editing !== null ? undefined : (
          <Button size="sm" icon="plus" onClick={startCreate}>
            {t("admin.newStaff")}
          </Button>
        )
      }
    >
      <div className="space-y-4 p-5">
        <p className="muted text-xs">{t("staff.desc")}</p>

        {notice && (
          <p
            className={`rounded-xl px-4 py-2.5 text-sm font-medium ${
              notice.ok
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
            }`}
          >
            {notice.text}
          </p>
        )}

        {/* Shown once. There is no second chance to read it back out of the
            database, so it stays on screen until the next action clears it. */}
        {revealed && (
          <div className="rounded-xl border border-gold-500/40 bg-gold-500/10 px-4 py-3">
            <p className="muted text-[11px] font-semibold uppercase tracking-wide">
              {t("staff.credentials")} · {revealed.name}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="min-w-0 break-all font-mono text-sm font-bold">
                {revealed.login} / {revealed.password}
              </p>
              <Button
                size="sm"
                variant="secondary"
                icon={copied ? "check" : undefined}
                onClick={() => void copyCredentials()}
                className="ml-auto"
              >
                {copied ? t("staff.copied") : t("staff.copy")}
              </Button>
            </div>
            <p className="muted mt-1.5 text-[11px]">{t("admin.copyNow")}</p>
          </div>
        )}

        {creating && (
          <div className="rounded-xl border">
            <StaffForm
              mode="create"
              values={values}
              managers={managers}
              busy={busy}
              onChange={setValues}
              onSubmit={create}
              onCancel={() => {
                setCreating(false);
                setValues(EMPTY_STAFF);
              }}
            />
          </div>
        )}

        {editing !== null && (
          <div className="rounded-xl border">
            <StaffForm
              mode="edit"
              values={values}
              managers={managers}
              busy={busy}
              onChange={setValues}
              onSubmit={() => saveEdit(editing)}
              onCancel={() => {
                setEditing(null);
                setValues(EMPTY_STAFF);
              }}
            />
          </div>
        )}

        {staff.length >= SEARCH_FROM && (
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("common.search")}
            aria-label={t("common.search")}
            className={`${FIELD} sm:max-w-xs`}
          />
        )}
      </div>

      {shown.length === 0 ? (
        <EmptyState bare icon="users" text={t("staff.noMatch")} />
      ) : (
        <ul className="divide-y border-t">
          {shown.map((person) => (
            <li
              key={person.id}
              className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3 ${
                person.is_active ? "" : "opacity-60"
              }`}
            >
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-full bg-navy-900 text-[11px] font-bold text-white dark:bg-navy-700"
              >
                {initials(person.full_name)}
              </span>

              <div className="min-w-0 flex-1 basis-48">
                <p className="flex flex-wrap items-center gap-x-2 truncate text-sm font-medium">
                  {person.full_name}
                  {person.id === selfId && (
                    <span className="muted text-[11px] font-normal">
                      ({t("staff.you")})
                    </span>
                  )}
                </p>
                <p className="muted truncate text-xs">
                  <span className="font-mono">@{person.login}</span>
                  {" · "}
                  {t(`role.${person.role}` as MessageKey)}
                  {person.position ? ` · ${person.position}` : ""}
                </p>
              </div>

              <p className="muted hidden text-[11px] tabular-nums lg:block">
                {person.last_seen
                  ? formatDateTime(person.last_seen)
                  : t("admin.never")}
              </p>

              {person.is_active === 0 && (
                <Badge className="bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/30">
                  {t("admin.inactive")}
                </Badge>
              )}

              <div className="ml-auto flex items-center gap-1.5">
                <IconButton
                  icon="user"
                  label={t("admin.edit")}
                  disabled={busy}
                  onClick={() => startEdit(person)}
                />
                <IconButton
                  icon="shield"
                  label={t("admin.resetPassword")}
                  disabled={busy}
                  onClick={() => void resetPassword(person)}
                />
                {/* Nobody switches off the account they are signed in with —
                    the server refuses it too, this only says so earlier. */}
                <IconButton
                  icon={person.is_active ? "close" : "check"}
                  label={
                    person.is_active
                      ? t("admin.deactivate")
                      : t("admin.activate")
                  }
                  disabled={busy || person.id === selfId}
                  onClick={() => void toggle(person)}
                />
                <IconButton
                  icon="trash"
                  label={t("admin.delete")}
                  disabled={busy || person.id === selfId}
                  onClick={() => void discard(person)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
