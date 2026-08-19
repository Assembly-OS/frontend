"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import type { AdminTask, AdminUser } from "@/lib/dev";
import type { Role, TaskStatus } from "@/lib/types";

type Result = { ok: boolean; message: string } | null;

export function ControlClient({
  users,
  tasks,
  assignees,
  roles,
  statuses,
}: {
  users: AdminUser[];
  tasks: AdminTask[];
  assignees: { id: number; label: string }[];
  roles: Role[];
  statuses: TaskStatus[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Result>(null);

  async function act(
    key: string,
    payload: Record<string, unknown>,
    confirmText?: string,
  ) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(key);
    setResult(null);
    try {
      const res = await fetch("/api/dev/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok: boolean; message: string };
      setResult(data);
      if (data.ok) router.refresh();
    } catch {
      setResult({ ok: false, message: "Сеть недоступна" });
    } finally {
      setBusy(null);
    }
  }

  const select =
    "rounded-lg border bg-[var(--surface)] px-2 py-1 text-xs outline-none focus:border-navy-500";
  const iconBtn =
    "grid size-7 place-items-center rounded-lg border transition hover:bg-[var(--surface)] disabled:opacity-40";

  return (
    <div className="space-y-6">
      {result && (
        <div
          role="status"
          className={`sticky top-3 z-20 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-lift ${
            result.ok
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
          }`}
        >
          <Icon name={result.ok ? "check" : "alert"} className="mt-0.5 size-4 shrink-0" />
          <span className="whitespace-pre-wrap">{result.message}</span>
          <button
            type="button"
            onClick={() => setResult(null)}
            className="ml-auto opacity-70 hover:opacity-100"
          >
            <Icon name="close" className="size-4" />
          </button>
        </div>
      )}

      {/* Maintenance */}
      <section className="panel p-5">
        <h2 className="mb-1 text-sm font-semibold">Обслуживание</h2>
        <p className="muted mb-4 text-xs">Инструменты БД и рантайма. Опасные — с подтверждением.</p>
        <div className="flex flex-wrap gap-2">
          {/* WAL checkpoint и VACUUM были обслуживанием файловой базы. Postgres
              делает это сам (autovacuum), и обработчики на бэкенде удалены —
              кнопки возвращали бы «Неизвестное действие». */}
          <MaintBtn label="Сбросить присутствие" icon="users" busy={busy === "maint.clearPresence"}
            onClick={() => act("maint.clearPresence", { type: "maint.clearPresence" })} />
          <MaintBtn label="Пересоздать БД (демо)" icon="alert" danger busy={busy === "maint.reseed"}
            onClick={() => act("maint.reseed", { type: "maint.reseed" }, "ПЕРЕСОЗДАТЬ базу из демо-данных? Все текущие данные будут стёрты и заменены. Действие необратимо.")} />
        </div>
      </section>

      {/* Users */}
      <section className="panel overflow-hidden">
        <div className="border-b px-5 py-3.5">
          <h2 className="text-sm font-semibold">Пользователи <span className="muted font-normal">· {users.length}</span></h2>
        </div>
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="muted border-b text-left text-[11px] uppercase tracking-wide">
                <th className="px-4 py-2 font-semibold">Сотрудник</th>
                <th className="px-3 py-2 font-semibold">Роль</th>
                <th className="px-3 py-2 font-semibold">Статус</th>
                <th className="px-3 py-2 text-right font-semibold">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-4 py-2">
                    <div className="font-medium">{u.full_name}</div>
                    <div className="muted font-mono text-[11px]">@{u.login}{u.department ? ` · ${u.department}` : ""}</div>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className={select}
                      value={u.role}
                      disabled={busy !== null}
                      onChange={(e) => act(`role-${u.id}`, { type: "user.setRole", id: u.id, role: e.target.value })}
                    >
                      {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${u.is_active ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-slate-500/15 text-slate-500"}`}>
                      {u.is_active ? "активен" : "выключен"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1.5">
                      <button type="button" title={u.is_active ? "Деактивировать" : "Активировать"} disabled={busy !== null} className={iconBtn}
                        onClick={() => act(`toggle-${u.id}`, { type: "user.toggleActive", id: u.id })}>
                        <Icon name={u.is_active ? "close" : "check"} className="size-3.5" />
                      </button>
                      <button type="button" title="Сбросить пароль" disabled={busy !== null} className={iconBtn}
                        onClick={() => act(`pw-${u.id}`, { type: "user.resetPassword", id: u.id }, `Сбросить пароль @${u.login} на 12345678?`)}>
                        <Icon name="user" className="size-3.5" />
                      </button>
                      <button type="button" title="Удалить" disabled={busy !== null} className={`${iconBtn} text-rose-600 dark:text-rose-400`}
                        onClick={() => act(`del-${u.id}`, { type: "user.delete", id: u.id }, `Удалить @${u.login}? Необратимо.`)}>
                        <Icon name="alert" className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tasks */}
      <section className="panel overflow-hidden">
        <div className="border-b px-5 py-3.5">
          <h2 className="text-sm font-semibold">Поручения <span className="muted font-normal">· последние {tasks.length}</span></h2>
        </div>
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="muted border-b text-left text-[11px] uppercase tracking-wide">
                <th className="px-4 py-2 font-semibold">Задача</th>
                <th className="px-3 py-2 font-semibold">Статус</th>
                <th className="px-3 py-2 font-semibold">Исполнитель</th>
                <th className="px-3 py-2 text-right font-semibold">Уд.</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="px-4 py-2">
                    <div className="muted font-mono text-[11px]">{t.code}</div>
                    <div className="max-w-[280px] truncate font-medium">{t.title}</div>
                  </td>
                  <td className="px-3 py-2">
                    <select className={select} value={t.status} disabled={busy !== null}
                      onChange={(e) => act(`st-${t.id}`, { type: "task.setStatus", id: t.id, status: e.target.value })}>
                      {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select className={`${select} max-w-[220px]`} value={t.to_user_id} disabled={busy !== null}
                      onChange={(e) => act(`re-${t.id}`, { type: "task.reassign", id: t.id, toUserId: Number(e.target.value) })}>
                      {assignees.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" title="Удалить" disabled={busy !== null} className={`${iconBtn} ml-auto text-rose-600 dark:text-rose-400`}
                      onClick={() => act(`tdel-${t.id}`, { type: "task.delete", id: t.id }, `Удалить ${t.code}? Необратимо.`)}>
                      <Icon name="alert" className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MaintBtn({
  label, icon, onClick, busy, danger,
}: {
  label: string;
  icon: "grid" | "users" | "alert";
  onClick: () => void;
  busy: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
        danger
          ? "border-rose-500/40 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
          : "hover:bg-[var(--surface)]"
      }`}
    >
      <Icon name={icon} className="size-4" />
      {busy ? "…" : label}
    </button>
  );
}
