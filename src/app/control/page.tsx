import { notFound } from "next/navigation";
import { hasDevAccess } from "@/lib/dev-auth";
import {
  adminTasks,
  adminUsers,
  assigneeOptions,
  dbStats,
  onlineUsers,
  recentEvents,
  systemInfo,
} from "@/lib/dev";
import { ROLES, TASK_STATUSES } from "@/lib/types";
import { Icon } from "@/components/icons";
import { ControlClient } from "./control-client";

export const dynamic = "force-dynamic";

function kb(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
  return `${Math.round(bytes / 1024)} КБ`;
}
function uptime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h} ч ${m} мин` : `${m} мин`;
}

export default async function ControlPage() {
  if (!(await hasDevAccess())) notFound();

  const stats = dbStats();
  const online = onlineUsers();
  const events = recentEvents(15);
  const sys = systemInfo();

  const tiles = [
    { label: "База", value: kb(stats.files.db), hint: `WAL ${kb(stats.files.wal)}` },
    { label: "Пользователи", value: stats.counts.users, hint: `онлайн ${online.length}` },
    { label: "Поручения", value: stats.counts.tasks, hint: `событий ${stats.counts.task_events}` },
    { label: "Сообщения", value: stats.counts.messages, hint: `объед. ${stats.counts.uyushmalar}` },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-navy-900 text-white dark:bg-navy-700">
            <Icon name="grid" className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold lg:text-2xl">Контроль-панель</h1>
            <p className="muted text-xs">
              скрытый dev-режим · {sys.env} · Node {sys.node} · аптайм {uptime(sys.uptimeSec)} · v{sys.version}
            </p>
          </div>
        </div>
        <a
          href="/api/dev/unlock?lock=1"
          className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition hover:bg-[var(--surface)]"
        >
          <Icon name="logout" className="size-4" />
          Заблокировать
        </a>
      </header>

      {/* Diagnostics */}
      <div className="mb-6 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="panel p-4">
            <p className="text-2xl font-bold leading-none tabular-nums">{t.value}</p>
            <p className="muted mt-1.5 text-xs font-medium">{t.label}</p>
            <p className="muted mt-0.5 text-[11px]">{t.hint}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-3">
        <section className="panel p-5">
          <h2 className="mb-3 text-sm font-semibold">Поручения по статусам</h2>
          <ul className="space-y-1.5">
            {stats.byStatus.map((s) => (
              <li key={s.status} className="flex items-center justify-between text-sm">
                <span className="muted font-mono text-xs">{s.status}</span>
                <span className="font-semibold tabular-nums">{s.count}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel p-5">
          <h2 className="mb-3 text-sm font-semibold">Сейчас онлайн <span className="muted font-normal">· {online.length}</span></h2>
          {online.length === 0 ? (
            <p className="muted text-sm">Никого нет в сети</p>
          ) : (
            <ul className="space-y-1.5">
              {online.map((u) => (
                <li key={u.id} className="flex items-center gap-2 text-sm">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span className="truncate">{u.full_name}</span>
                  <span className="muted ml-auto font-mono text-[11px]">{u.role}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel p-5">
          <h2 className="mb-3 text-sm font-semibold">Последние события</h2>
          <ul className="space-y-1.5">
            {events.map((e) => (
              <li key={e.id} className="flex items-center gap-2 text-xs">
                <span className="muted font-mono">{e.code}</span>
                <span className="truncate font-medium">{e.action}</span>
                <span className="muted ml-auto shrink-0">{e.created_at.slice(5, 16)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Interactive management + maintenance */}
      <ControlClient
        users={adminUsers()}
        tasks={adminTasks(40)}
        assignees={assigneeOptions()}
        roles={ROLES}
        statuses={TASK_STATUSES}
      />
    </main>
  );
}
